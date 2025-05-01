// 使用您的 Google AI API 金鑰
const API_KEY = 'AIzaSyDh2CEwm_WZ4HQdRUcOCFVHT4bHF7lqFdw';

// 遊戲變數
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gridSize = 20;
const tileCount = canvas.width / gridSize;

// 蛇的初始設定
let snake = {
    x: 10,
    y: 10,
    dx: 0,
    dy: 0,
    cells: [],
    maxCells: 4
};

// 遊戲狀態
let foods = [];
let score = 0;
let gameActive = true;

// 遊戲狀態變數
let isGameStarted = false;
let isPaused = false;
let gameLoop = null;

// 生成創意點子
async function generateIdeasForTopic(topic) {
    const prompt = `請針對主題「${topic}」，提供3個創新的想法或解決方案。每個想法20字以內，確保想法具體且實用。格式：
1. [想法1]
2. [想法2]
3. [想法3]`;
    
    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + API_KEY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('API 錯誤詳細資訊:', errorData);
            throw new Error(`API 錯誤: ${response.status} - ${errorData.error?.message || '未知錯誤'}`);
        }

        const data = await response.json();
        console.log('API 回應:', data);
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
            throw new Error('無效的 API 回應格式');
        }

        const responseText = data.candidates[0].content.parts[0].text;
        console.log('API 回應文本:', responseText);
        
        const ideas = responseText
            .split('\n')
            .filter(line => line.trim().match(/^\d+\./))
            .map(line => line.replace(/^\d+\.\s*/, '').trim());

        if (ideas.length === 0) {
            throw new Error('無法解析 API 回應');
        }

        return ideas;
    } catch (error) {
        console.error('生成創意點子時發生錯誤:', error);
        return [
            `關於「${topic}」的想法 1`,
            `關於「${topic}」的想法 2`,
            `關於「${topic}」的想法 3`
        ];
    }
}

// 生成相關的創意點子
async function generateRelatedIdeas(baseIdea) {
    const prompt = `基於這個想法「${baseIdea}」，請提供3個相關的延伸創意點子，每個想法20字以內。格式：
1. [延伸想法1]
2. [延伸想法2]
3. [延伸想法3]`;
    
    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + API_KEY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('API 錯誤詳細資訊:', errorData);
            throw new Error(`API 錯誤: ${response.status} - ${errorData.error?.message || '未知錯誤'}`);
        }

        const data = await response.json();
        console.log('相關想法 API 回應:', data);
        
        const responseText = data.candidates[0].content.parts[0].text;
        const ideas = responseText
            .split('\n')
            .filter(line => line.trim().match(/^\d+\./))
            .map(line => line.replace(/^\d+\.\s*/, '').trim());

        return ideas;
    } catch (error) {
        console.error('生成相關創意點子時發生錯誤:', error);
        return [
            `${baseIdea} - 延伸想法 1`,
            `${baseIdea} - 延伸想法 2`,
            `${baseIdea} - 延伸想法 3`
        ];
    }
}

// 生成隨機顏色
function getRandomColor() {
    const colors = [
        '#FF6B6B', // 紅色系
        '#4ECDC4', // 青色系
        '#45B7D1', // 藍色系
        '#96CEB4', // 綠色系
        '#FFEEAD', // 黃色系
        '#D4A5A5', // 粉色系
        '#9B59B6', // 紫色系
        '#3498DB', // 深藍色
        '#E67E22', // 橙色系
        '#2ECC71'  // 翠綠色
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// 遊戲初始化
function initGame() {
    snake = {
        x: 10,
        y: 10,
        dx: 1,
        dy: 0,
        cells: [{x: 10, y: 10}],
        maxCells: 4
    };
    foods = [];
    score = 0;
    gameActive = true;
    document.getElementById('scoreValue').textContent = score;
    document.getElementById('gameOver').style.display = 'none';
}

// 生成隨機位置
function getRandomPosition() {
    return {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount)
    };
}

// 添加創意食物
async function addFood(idea, parentIdea = '') {
    const pos = getRandomPosition();
    foods.push({
        x: pos.x,
        y: pos.y,
        idea: idea,
        parentIdea: parentIdea,
        color: getRandomColor() // 為每個點子球添加顏色
    });
}

// 添加想法到列表
function addIdeaToList(idea) {
    const ideasList = document.getElementById('ideasList');
    const ideaElement = document.createElement('div');
    ideaElement.className = 'idea-item';
    
    if (idea.includes('基於「')) {
        ideaElement.style.marginLeft = '20px';
        ideaElement.style.borderLeft = '3px solid #4CAF50';
    }
    
    ideaElement.textContent = idea;
    ideasList.insertBefore(ideaElement, ideasList.firstChild);
}

// 提交新想法
async function submitIdea() {
    const input = document.getElementById('ideaInput');
    const topic = input.value.trim();
    
    if (topic) {
        input.value = '';
        foods = [];
        
        const ideas = await generateIdeasForTopic(topic);
        console.log('生成的想法:', ideas);
        
        for (const idea of ideas) {
            addIdeaToList(`主題: ${topic}\n想法: ${idea}`);
            await addFood(idea);
        }
    }
}

// 切換遊戲狀態（開始/停止）
function toggleGame() {
    const startBtn = document.getElementById('startBtn');
    
    if (!isGameStarted) {
        startGame();
        startBtn.textContent = '停止遊戲';
        startBtn.classList.add('active');
    } else {
        stopGame();
        startBtn.textContent = '開始遊戲';
        startBtn.classList.remove('active');
    }
}

// 切換暫停狀態
function togglePause() {
    if (!isGameStarted) return;
    
    const pauseBtn = document.getElementById('pauseBtn');
    isPaused = !isPaused;
    
    if (isPaused) {
        clearInterval(gameLoop);
        pauseBtn.textContent = '繼續';
        pauseBtn.classList.add('active');
    } else {
        gameLoop = setInterval(gameUpdate, 100);
        pauseBtn.textContent = '暫停';
        pauseBtn.classList.remove('active');
    }
}

// 開始遊戲
function startGame() {
    isGameStarted = true;
    isPaused = false;
    initGame();
    gameLoop = setInterval(gameUpdate, 100);
}

// 停止遊戲
function stopGame() {
    isGameStarted = false;
    isPaused = false;
    clearInterval(gameLoop);
    gameLoop = null;
    
    // 重置暫停按鈕狀態
    const pauseBtn = document.getElementById('pauseBtn');
    pauseBtn.textContent = '暫停';
    pauseBtn.classList.remove('active');
    
    // 清空畫布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// 遊戲主循環
function gameUpdate() {
    if (!isGameStarted || isPaused) return;

    snake.x += snake.dx;
    snake.y += snake.dy;

    if (snake.x < 0) snake.x = tileCount - 1;
    if (snake.x >= tileCount) snake.x = 0;
    if (snake.y < 0) snake.y = tileCount - 1;
    if (snake.y >= tileCount) snake.y = 0;

    snake.cells.unshift({x: snake.x, y: snake.y});
    if (snake.cells.length > snake.maxCells) {
        snake.cells.pop();
    }

    ctx.fillStyle = '#0f3460';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 繪製網格
    ctx.strokeStyle = '#1a1a2e';
    for (let i = 0; i < tileCount; i++) {
        for (let j = 0; j < tileCount; j++) {
            ctx.strokeRect(i * gridSize, j * gridSize, gridSize, gridSize);
        }
    }

    // 繪製食物和處理碰撞
    for (let i = foods.length - 1; i >= 0; i--) {
        const food = foods[i];
        
        // 使用食物的顏色
        ctx.fillStyle = food.color;
        ctx.beginPath();
        ctx.arc(
            (food.x * gridSize) + (gridSize/2), 
            (food.y * gridSize) + (gridSize/2), 
            gridSize/2 - 2, 
            0, 
            Math.PI * 2
        );
        ctx.fill();
        
        // 添加閃爍效果
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        if (food.x === snake.x && food.y === snake.y) {
            const eatenFood = foods.splice(i, 1)[0];
            snake.maxCells++;
            score += 10;
            document.getElementById('scoreValue').textContent = score;
            
            const ideaText = eatenFood.parentIdea 
                ? `基於「${eatenFood.parentIdea}」的延伸想法:\n${eatenFood.idea}`
                : `主題想法: ${eatenFood.idea}`;
            
            // 在想法列表中使用相同的顏色
            const ideaElement = document.createElement('div');
            ideaElement.className = 'idea-item';
            ideaElement.style.borderLeft = `3px solid ${eatenFood.color}`;
            if (eatenFood.parentIdea) {
                ideaElement.style.marginLeft = '20px';
            }
            ideaElement.textContent = ideaText;
            
            const ideasList = document.getElementById('ideasList');
            ideasList.insertBefore(ideaElement, ideasList.firstChild);
            
            generateRelatedIdeas(eatenFood.idea).then(newIdeas => {
                newIdeas.forEach(async (newIdea) => {
                    await addFood(newIdea, eatenFood.idea);
                });
            });
        }
    }

    // 繪製蛇
    snake.cells.forEach((cell, index) => {
        ctx.fillStyle = index === 0 ? '#4CAF50' : '#45a049';
        ctx.fillRect(
            cell.x * gridSize + 1, 
            cell.y * gridSize + 1, 
            gridSize - 2, 
            gridSize - 2
        );
    });

    // 檢查自身碰撞
    for (let i = 1; i < snake.cells.length; i++) {
        if (snake.cells[i].x === snake.x && snake.cells[i].y === snake.y) {
            gameOver();
            return;
        }
    }
}

// 遊戲結束
function gameOver() {
    gameActive = false;
    document.getElementById('gameOver').style.display = 'block';
    document.getElementById('finalScore').textContent = score;
    clearInterval(gameLoop);
}

// 重新開始遊戲
function restartGame() {
    initGame();
    gameLoop = setInterval(gameUpdate, 100);
}

// 控制蛇的移動
document.addEventListener('keydown', function(e) {
    if (!isGameStarted || isPaused) return;
    
    switch(e.key) {
        case 'ArrowLeft':
            if (snake.dx === 0) {
                snake.dx = -1;
                snake.dy = 0;
            }
            break;
        case 'ArrowRight':
            if (snake.dx === 0) {
                snake.dx = 1;
                snake.dy = 0;
            }
            break;
        case 'ArrowUp':
            if (snake.dy === 0) {
                snake.dx = 0;
                snake.dy = -1;
            }
            break;
        case 'ArrowDown':
            if (snake.dy === 0) {
                snake.dx = 0;
                snake.dy = 1;
            }
            break;
    }
});

// 處理鍵盤事件
function handleKeyPress(event) {
    if (event.key === 'Enter' && document.activeElement === document.getElementById('ideaInput')) {
        submitIdea();
    }
}

// 初始化遊戲
window.onload = async function() {
    if (!ctx) {
        console.error('無法獲取 canvas 上下文');
        return;
    }
    
    // 初始化遊戲，但不自動開始
    initGame();
    
    const initialTopic = "創意思考";
    const ideas = await generateIdeasForTopic(initialTopic);
    for (const idea of ideas) {
        addIdeaToList(`初始主題: ${initialTopic}\n想法: ${idea}`);
        await addFood(idea);
    }
};