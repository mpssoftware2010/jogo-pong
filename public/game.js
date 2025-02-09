const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Configuração do canvas
canvas.width = 800;
canvas.height = 400;

// Configurações do jogo
const paddleHeight = 100;
const paddleWidth = 10;
const ballSize = 25;
const paddleSpeed = 8; // Velocidade de movimento da raquete

// Estado do jogo
let player1Score = 0;  // Pontuação jogador esquerda
let player2Score = 0;  // Pontuação jogador direita
let player1Y = (canvas.height - paddleHeight) / 2;
let player2Y = (canvas.height - paddleHeight) / 2;
let ballX = canvas.width / 2;
let ballY = canvas.height / 2;
let ballSpeedX = 5;
let ballSpeedY = 5;
let ballRotation = 0; // Novo: ângulo de rotação da bola
let upPressed = false;
let downPressed = false;
let arrowUpPressed = false;
let arrowDownPressed = false;
let isPaused = false;
const WINNING_SCORE = 10;
let gameOver = false;

// Adicionar após as variáveis de estado
let adCounter = 0;
const AD_FREQUENCY = 3; // Mostra ad a cada 3 pontos marcados

// Adicionar após as variáveis de estado
const ballTrail = []; // Array para armazenar as posições anteriores da bola
const TRAIL_LENGTH = 5; // Quantidade de posições para o rastro
const TRAIL_OPACITY = 0.3; // Opacidade inicial do rastro

// Substituir a detecção de mobile existente por uma mais robusta
const isMobile = {
    Android: function() {
        return navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function() {
        return navigator.userAgent.match(/BlackBerry/i);
    },
    iOS: function() {
        return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    Opera: function() {
        return navigator.userAgent.match(/Opera Mini/i);
    },
    Windows: function() {
        return navigator.userAgent.match(/IEMobile/i) || navigator.userAgent.match(/WPDesktop/i);
    },
    any: function() {
        return (
            isMobile.Android() || 
            isMobile.BlackBerry() || 
            isMobile.iOS() || 
            isMobile.Opera() || 
            isMobile.Windows() || 
            ('ontouchstart' in window) || 
            (window.matchMedia("(max-width: 768px)").matches)
        );
    }
};

// Função para entrar em fullscreen
function enterFullscreen() {
    const element = document.documentElement;
    
    // Tenta forçar orientação landscape antes do fullscreen
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape')
            .then(() => {
                // Após garantir orientação, entra em fullscreen
                if (element.requestFullscreen) {
                    element.requestFullscreen();
                } else if (element.webkitRequestFullscreen) {
                    element.webkitRequestFullscreen();
                } else if (element.msRequestFullscreen) {
                    element.msRequestFullscreen();
                }
            })
            .catch(function(error) {
                console.warn('Erro ao forçar orientação:', error);
                // Tenta entrar em fullscreen mesmo se falhar a orientação
                if (element.requestFullscreen) {
                    element.requestFullscreen();
                } else if (element.webkitRequestFullscreen) {
                    element.webkitRequestFullscreen();
                } else if (element.msRequestFullscreen) {
                    element.msRequestFullscreen();
                }
            });
    }
}

// Adiciona os event listeners para as teclas
document.addEventListener('keydown', (e) => {
    if (e.key === 'w' || e.key === 'W') {
        upPressed = true;
        console.log('Tecla W pressionada');
    }
    if (e.key === 's' || e.key === 'S') {
        downPressed = true;
        console.log('Tecla S pressionada');
    }
    if (e.key === 'ArrowUp') arrowUpPressed = true;
    if (e.key === 'ArrowDown') arrowDownPressed = true;
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'w' || e.key === 'W') upPressed = false;
    if (e.key === 's' || e.key === 'S') downPressed = false;
    if (e.key === 'ArrowUp') arrowUpPressed = false;
    if (e.key === 'ArrowDown') arrowDownPressed = false;
});

// Carrega a imagem da bola
const ballImage = new Image();
ballImage.src = './bola.png';

// Função para gerar direção aleatória
function getRandomDirection() {
    // Gera um ângulo aleatório entre -45 e 45 graus
    const angle = (Math.random() * 90 - 45) * Math.PI / 180;
    // Direção inicial (esquerda ou direita) aleatória
    const direction = Math.random() < 0.5 ? -1 : 1;
    
    return {
        x: Math.cos(angle) * 5 * direction,
        y: Math.sin(angle) * 5
    };
}

// Ajuste do canvas para ser responsivo
function resizeCanvas() {
    const container = document.querySelector('.game-container');
    let containerWidth = container.clientWidth;
    let containerHeight = window.innerHeight;

    if (isMobile.any()) {
        // Força aspect ratio 2:1 em mobile
        if (window.innerWidth > window.innerHeight) {
            containerHeight = window.innerHeight;
            containerWidth = containerHeight * 2;
        } else {
            containerWidth = window.innerWidth;
            containerHeight = containerWidth / 2;
        }
    }

    const scale = Math.min(containerWidth / 800, containerHeight / 400);
    canvas.style.width = `${800 * scale}px`;
    canvas.style.height = `${400 * scale}px`;
}

// Controles mobile
const setupMobileControls = () => {
    const buttons = {
        up1: document.getElementById('up1'),
        down1: document.getElementById('down1'),
        up2: document.getElementById('up2'),
        down2: document.getElementById('down2')
    };

    // Touch events para Player 1
    buttons.up1.addEventListener('touchstart', () => upPressed = true);
    buttons.up1.addEventListener('touchend', () => upPressed = false);
    buttons.down1.addEventListener('touchstart', () => downPressed = true);
    buttons.down1.addEventListener('touchend', () => downPressed = false);

    // Touch events para Player 2
    buttons.up2.addEventListener('touchstart', () => arrowUpPressed = true);
    buttons.up2.addEventListener('touchend', () => arrowUpPressed = false);
    buttons.down2.addEventListener('touchstart', () => arrowDownPressed = true);
    buttons.down2.addEventListener('touchend', () => arrowDownPressed = false);

    // Prevenir comportamentos padrão do touch
    document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    // Adicionar estilos de transição
    if (mobileControls) {
        mobileControls.style.transition = 'opacity 0.3s ease';
        mobileControls.style.opacity = '1';
        mobileControls.style.display = 'flex';
    }
};

// Controles do jogo
function setupGameControls() {
    const gameControls = document.querySelector('.game-controls');
    const pauseBtn = document.getElementById('pauseBtn');
    const restartBtn = document.getElementById('restartBtn');
    const aboutBtn = document.getElementById('aboutBtn');
    const modal = document.getElementById('aboutModal');
    const closeBtn = document.querySelector('.close-btn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');

    pauseBtn.addEventListener('click', () => {
        isPaused = !isPaused;
        pauseBtn.textContent = isPaused ? '▶️' : '⏸️';
        pauseBtn.classList.toggle('paused', isPaused);
    });

    restartBtn.addEventListener('click', () => {
        // Reinicia o jogo
        player1Score = 0;
        player2Score = 0;
        player1Y = (canvas.height - paddleHeight) / 2;
        player2Y = (canvas.height - paddleHeight) / 2;
        gameOver = false;
        isPaused = false;
        resetBall();
        pauseBtn.textContent = '⏸️';
        pauseBtn.classList.remove('paused');
    });

    // Controle do modal
    aboutBtn.addEventListener('click', () => {
        modal.style.display = 'block';
        isPaused = true;
        pauseBtn.textContent = '▶️';
        pauseBtn.classList.add('paused');
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        isPaused = false;
        pauseBtn.textContent = '⏸️';
        pauseBtn.classList.remove('paused');
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            isPaused = false;
            pauseBtn.textContent = '⏸️';
            pauseBtn.classList.remove('paused');
        }
    });

    const continueBtn = document.getElementById('continueBtn');
    if (continueBtn) {
        continueBtn.addEventListener('click', () => {
            const victoryModal = document.getElementById('victoryModal');
            if (victoryModal) {
                victoryModal.style.display = 'none';
            }
            if (restartBtn) {
                restartBtn.click();
            }
        });
    }

    if (isMobile.any()) {
        // Força modo tela cheia em iOS
        if (isMobile.iOS()) {
            document.body.style.height = '100vh';
            document.body.style.width = '100vw';
            document.body.style.position = 'fixed';
            
            // Tenta forçar orientação em iOS
            if (window.orientation !== 90 && window.orientation !== -90) {
                alert('Por favor, rotacione seu dispositivo para modo paisagem');
            }
        }

        fullscreenBtn.style.display = 'block';
        
        // Verifica se o dispositivo suporta orientação landscape
        if (screen.orientation && screen.orientation.type.includes('portrait')) {
            alert('Por favor, rotacione seu dispositivo para landscape');
        }

        // Detecta mudanças de orientação
        window.addEventListener('orientationchange', function() {
            setTimeout(() => {
                if (window.orientation === 0 || window.orientation === 180) {
                    alert('Por favor, rotacione seu dispositivo para landscape');
                } else {
                    resizeCanvas();
                }
            }, 100);
        });

        // Previne zoom e comportamentos indesejados
        document.addEventListener('touchmove', function(e) {
            if (e.scale !== 1) {
                e.preventDefault();
            }
        }, { passive: false });

        document.addEventListener('gesturestart', function(e) {
            e.preventDefault();
        });

        // Mostra os controles mobile
        document.querySelector('.mobile-controls').style.display = 'flex';
        
        // Tenta entrar em fullscreen automaticamente no primeiro toque
        document.addEventListener('touchstart', function initFullscreen() {
            enterFullscreen();
            document.removeEventListener('touchstart', initFullscreen);
        }, { once: true });

        // Mostra alerta para rotacionar se estiver em portrait
        if (window.innerHeight > window.innerWidth) {
            alert('Por favor, rotacione seu dispositivo para melhor experiência');
        }

        // Oculta controles após 3 segundos de inatividade
        let controlsTimeout;
        
        function showControls() {
            gameControls.style.opacity = '0.6';
            clearTimeout(controlsTimeout);
            controlsTimeout = setTimeout(() => {
                if (!isPaused) {
                    gameControls.style.opacity = '0.2';
                }
            }, 3000);
        }

        // Mostrar controles ao tocar na tela
        document.addEventListener('touchstart', showControls);
        
        // Manter controles visíveis quando pausado
        pauseBtn.addEventListener('click', () => {
            if (isPaused) {
                gameControls.style.opacity = '0.6';
                clearTimeout(controlsTimeout);
            } else {
                showControls();
            }
        });

        // Verifica e força orientação a cada mudança
        window.addEventListener('orientationchange', function() {
            if (screen.orientation && screen.orientation.type.includes('portrait')) {
                screen.orientation.lock('landscape').catch(console.warn);
            }
        });

        // Força orientação ao iniciar
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(console.warn);
        }

        // Tenta forçar orientação periodicamente (alguns dispositivos são teimosos)
        setInterval(() => {
            if (window.orientation === 0 || window.orientation === 180) {
                screen.orientation.lock('landscape').catch(console.warn);
            }
        }, 1000);
    } else {
        fullscreenBtn.style.display = 'none';
        document.querySelector('.mobile-controls').style.display = 'none';
    }
}

// Loop principal do jogo
function gameLoop() {
    if (!isPaused) {
        update();
    }
    draw();
    requestAnimationFrame(gameLoop);
}

// Atualiza a lógica do jogo
function update() {
    if (gameOver) return;
    
    // Movimento da raquete com limites ajustados
    if (upPressed) {
        player1Y = Math.max(0, player1Y - paddleSpeed);
    }
    if (downPressed) {
        player1Y = Math.min(canvas.height - paddleHeight, player1Y + paddleSpeed);
    }

    // Movimento da raquete direita
    if (arrowUpPressed) {
        player2Y = Math.max(0, player2Y - paddleSpeed);
    }
    if (arrowDownPressed) {
        player2Y = Math.min(canvas.height - paddleHeight, player2Y + paddleSpeed);
    }

    // Movimentação da bola
    ballX += ballSpeedX;
    ballY += ballSpeedY;

    // Colisão com as raquetes
    // Raquete esquerda
    if (ballX - ballSize <= 30 + paddleWidth && 
        ballY >= player1Y && 
        ballY <= player1Y + paddleHeight) {
        ballX = 30 + paddleWidth + ballSize;
        ballSpeedX *= -1;
        // Aumenta a velocidade e define a direção da rotação
        if (ballSpeedX < 0) {
            ballSpeedX -= 0.5;
            ballRotation -= 0.2; // Gira no sentido anti-horário
        } else {
            ballSpeedX += 0.5;
            ballRotation += 0.2; // Gira no sentido horário
        }
        if (ballSpeedY < 0) ballSpeedY -= 0.5;
        else ballSpeedY += 0.5;
    }

    // Raquete direita
    if (ballX + ballSize >= canvas.width - 30 - paddleWidth && 
        ballY >= player2Y && 
        ballY <= player2Y + paddleHeight) {
        ballX = canvas.width - 30 - paddleWidth - ballSize;
        ballSpeedX *= -1;
        // Aumenta a velocidade e define a direção da rotação
        if (ballSpeedX < 0) {
            ballSpeedX -= 0.5;
            ballRotation -= 0.2; // Gira no sentido anti-horário
        } else {
            ballSpeedX += 0.5;
            ballRotation += 0.2; // Gira no sentido horário
        }
        if (ballSpeedY < 0) ballSpeedY -= 0.5;
        else ballSpeedY += 0.5;
    }

    // Atualiza a rotação continuamente
    ballRotation += (ballSpeedX > 0 ? 0.1 : -0.1);

    // Colisão com as paredes (topo e baixo)
    if (ballY <= 0 || ballY >= canvas.height) {
        ballSpeedY *= -1;
    }

    // Reset da bola se sair pela direita ou esquerda e atualiza pontuação
    if (ballX < 0) {
        player2Score++; // Ponto para jogador da direita
        checkWinner(2);
        resetBall();
    } else if (ballX > canvas.width) {
        player1Score++; // Ponto para jogador da esquerda
        checkWinner(1);
        resetBall();
    }
}

// Função para resetar a bola com velocidade inicial
function resetBall() {
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;
    const newDirection = getRandomDirection();
    ballSpeedX = newDirection.x;
    ballSpeedY = newDirection.y;
    ballRotation = 0; // Reseta a rotação
    ballTrail.length = 0; // Limpa o rastro quando a bola é resetada
}

// Desenha os elementos do jogo
function draw() {
    // Limpa o canvas com fundo semi-transparente
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Desenha linha central pontilhada
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.stroke();
    ctx.setLineDash([]);

    // Desenha as raquetes com gradiente colorido
    const paddleGradient = ctx.createLinearGradient(0, 0, paddleWidth, 0);
    paddleGradient.addColorStop(0, '#23d5ab');
    paddleGradient.addColorStop(1, '#23a6d5');
    
    ctx.fillStyle = paddleGradient;
    ctx.fillRect(30, player1Y, paddleWidth, paddleHeight);
    ctx.fillRect(canvas.width - paddleWidth - 30, player2Y, paddleWidth, paddleHeight);

    // Desenha o rastro da bola
    ballTrail.forEach((pos, index) => {
        const opacity = TRAIL_OPACITY * (1 - index / TRAIL_LENGTH);
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(pos.rotation);
        ctx.globalAlpha = opacity;
        ctx.drawImage(ballImage, -ballSize, -ballSize, ballSize * 2, ballSize * 2);
        ctx.restore();
    });

    // Atualiza o array do rastro
    ballTrail.unshift({ x: ballX, y: ballY, rotation: ballRotation });
    if (ballTrail.length > TRAIL_LENGTH) {
        ballTrail.pop();
    }

    // Desenha a bola usando a imagem com rotação
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(ballX, ballY);
    ctx.rotate(ballRotation); // Aplica a rotação
    ctx.drawImage(ballImage, -ballSize, -ballSize, ballSize * 2, ballSize * 2);
    ctx.restore();

    // Desenha a pontuação
    ctx.fillStyle = '#fff';
    ctx.font = '32px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(player2Score, canvas.width - 50, 50); // Pontuação direita
    ctx.textAlign = 'left';
    ctx.fillText(player1Score, 50, 50); // Pontuação esquerda

    // Desenha mensagem de pause se necessário (apenas se não estiver em game over)
    if (isPaused && !gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSADO', canvas.width / 2, canvas.height / 2);
    }

    // Desenha mensagem de game over se necessário
    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`JOGADOR ${player1Score > player2Score ? '1' : '2'} VENCEU!`, 
            canvas.width / 2, canvas.height / 2 - 30);
        ctx.font = '24px Arial';
        ctx.fillText('Pressione "Reiniciar" para jogar novamente', 
            canvas.width / 2, canvas.height / 2 + 30);
    }
}

// Adicionar nova função para verificar vencedor
function checkWinner(player) {
    if ((player === 1 && player1Score >= WINNING_SCORE) || 
        (player === 2 && player2Score >= WINNING_SCORE)) {
        gameOver = true;
        isPaused = true;
        setTimeout(() => {
            showVictoryAd();
        }, 1000); // Delay para mostrar o modal de vitória
    } else {
        // Contagem de pontos para anúncios
        adCounter++;
        if (adCounter >= AD_FREQUENCY) {
            adCounter = 0;
            try {
                refreshAds();
            } catch (e) {
                console.warn('Erro ao atualizar anúncios:', e);
            }
        }
    }
}

// Adicionar novas funções para controle de anúncios
function showVictoryAd() {
    try {
        const victoryModal = document.getElementById('victoryModal');
        if (victoryModal) {
            victoryModal.style.display = 'block';
            try {
                (adsbygoogle = window.adsbygoogle || []).push({});
            } catch (e) {
                console.warn('AdSense não carregado:', e);
            }
        }
    } catch (e) {
        console.error('Erro ao mostrar modal de vitória:', e);
    }
}

function refreshAds() {
    if (typeof adsbygoogle !== 'undefined') {
        try {
            (adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.warn('Erro ao atualizar anúncios:', e);
        }
    }
}

// Adicionar após as variáveis de estado
let usingKeyboard = false; // Nova variável para controlar a visibilidade dos controles
const mobileControls = document.querySelector('.mobile-controls');

// Modificar os event listeners de teclado
document.addEventListener('keydown', (e) => {
    usingKeyboard = true;
    if (mobileControls) {
        mobileControls.style.opacity = '0';
        // Mantém os controles no DOM mas invisíveis para poder voltar facilmente
        setTimeout(() => {
            if (usingKeyboard) {
                mobileControls.style.display = 'none';
            }
        }, 300); // Aguarda a animação de fade out
    }

    if (e.key === 'w' || e.key === 'W') {
        upPressed = true;
    }
    if (e.key === 's' || e.key === 'S') {
        downPressed = true;
    }
    if (e.key === 'ArrowUp') arrowUpPressed = true;
    if (e.key === 'ArrowDown') arrowDownPressed = true;
});

// Adicionar touchstart listener para mostrar controles novamente
document.addEventListener('touchstart', () => {
    if (usingKeyboard && mobileControls) {
        usingKeyboard = false;
        mobileControls.style.display = 'flex';
        // Pequeno delay para permitir que o display: flex seja aplicado antes da opacidade
        requestAnimationFrame(() => {
            mobileControls.style.opacity = '1';
        });
    }
});

// Inicia o jogo com direção aleatória
resetBall();

// Inicia o jogo
gameLoop();

// Inicialização
window.addEventListener('load', () => {
    resizeCanvas();
    setupMobileControls();
    setupGameControls();
    
    // Inicialização segura dos anúncios
    setTimeout(() => {
        try {
            refreshAds();
        } catch (e) {
            console.warn('Erro ao inicializar anúncios:', e);
        }
    }, 1000);
});

window.addEventListener('resize', resizeCanvas);
