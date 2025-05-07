// --- 參數與狀態 ---
const API_KEY = 'AIzaSyDh2CEwm_WZ4HQdRUcOCFVHT4bHF7lqFdw';
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gridSize = 20;
const tileCountX = Math.floor(canvas.width / gridSize);
const tileCountY = Math.floor(canvas.height / gridSize);
let snake, foods, score, gameLoop;

// --- 初始化 ---
function initGame() {
    snake = {
        dx: 1, dy: 0,
        body: [{ x: Math.floor(tileCountX / 2), y: Math.floor(tileCountY / 2) }]
    };
    foods = [];
    score = 0;
    document.getElementById('scoreValue').textContent = score;
    document.getElementById('ideasList').innerHTML = '';
    addRandomFood();
}

function addRandomFood(idea, parentIdea) {
    const pos = getRandomPosition();
    foods.push({
        x: pos.x, y: pos.y,
        color: getRandomColor(),
        idea: idea || '',
        parentIdea: parentIdea || ''
    });
}

function getRandomPosition() {
    return {
        x: Math.floor(Math.random() * tileCountX),
        y: Math.floor(Math.random() * tileCountY)
    };
}

function getRandomColor() {
    const colors = ['#FF6B6B','#4ECDC4','#FFD700','#9B59B6','#3498DB','#E67E22','#2ECC71'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// --- 畫面 ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 蛇
    snake.body.forEach((s, i) => {
        ctx.fillStyle = i === 0 ? '#FF6B6B' : '#4ECDC4';
        ctx.fillRect(s.x * gridSize, s.y * gridSize, gridSize, gridSize);
    });
    // 食物
    foods.forEach(f => {
        ctx.fillStyle = f.color;
        ctx.fillRect(f.x * gridSize, f.y * gridSize, gridSize, gridSize);
    });
}

// --- 遊戲主循環 ---
function update() {
    const head = { ...snake.body[0] };
    head.x += snake.dx;
    head.y += snake.dy;
    // 穿牆
    if (head.x < 0) head.x = tileCountX - 1;
    if (head.x >= tileCountX) head.x = 0;
    if (head.y < 0) head.y = tileCountY - 1;
    if (head.y >= tileCountY) head.y = 0;
    // 撞到自己
    if (snake.body.slice(1).some(seg => seg.x === head.x && seg.y === head.y)) {
        alert('Game Over!');
        initGame();
        return;
    }
    snake.body.unshift(head);
    // 吃到食物
    let ate = false;
    for (let i = 0; i < foods.length; i++) {
        if (head.x === foods[i].x && head.y === foods[i].y) {
            score += 10;
            document.getElementById('scoreValue').textContent = score;
            addIdeaToList(foods[i].idea, foods[i].parentIdea);
            if (foods[i].idea) generateRelatedIdeas(foods[i].idea);
            foods.splice(i, 1);
            ate = true;
            break;
        }
    }
    if (!ate) snake.body.pop();
    if (foods.length === 0) addRandomFood();
    draw();
}

// --- 創意點子串接與顯示 ---
async function generateIdeasForTopic(topic) {
    if (!API_KEY) return ['創意1','創意2','創意3'];
    const prompt = `請針對主題「${topic}」，提供3個創新想法。每個20字內。格式：1. 2. 3.`;
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key='+API_KEY, {
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})
    });
    const data = await res.json();
    const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return txt.split('\n').map(l=>l.replace(/^\d+\.\s*/,'').trim()).filter(Boolean);
}

async function generateRelatedIdeas(baseIdea) {
    if (!API_KEY) return;
    const prompt = `基於「${baseIdea}」，再給3個延伸創意。每個20字內。格式：1. 2. 3.`;
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key='+API_KEY, {
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})
    });
    const data = await res.json();
    const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    txt.split('\n').map(l=>l.replace(/^\d+\.\s*/,'').trim()).filter(Boolean).forEach(idea=>addRandomFood(idea, baseIdea));
}

function addIdeaToList(idea, parentIdea) {
    if (!idea) return;
    const ideasList = document.getElementById('ideasList');
    const div = document.createElement('div');
    div.className = 'idea-item';
    div.textContent = parentIdea ? `基於「${parentIdea}」: ${idea}` : idea;
    if (parentIdea) div.style.marginLeft = '20px';
    ideasList.insertBefore(div, ideasList.firstChild);
}

// --- 主題輸入互動 ---
async function submitIdea() {
    const input = document.getElementById('ideaInput');
    const topic = input.value.trim();
    if (!topic) return;
    input.value = '';
    foods = [];
    const ideas = await generateIdeasForTopic(topic);
    ideas.forEach(idea => {
        addIdeaToList(idea);
        addRandomFood(idea);
    });
}

function handleKeyPress(e) {
    if (e.key === 'Enter') submitIdea();
}

// --- 鍵盤控制 ---
document.addEventListener('keydown', function(e) {
    const d = snake.body.length > 1 ? snake.body[0] : null;
    switch(e.key) {
        case 'ArrowLeft': if (snake.dx !== 1) { snake.dx = -1; snake.dy = 0; } break;
        case 'ArrowRight': if (snake.dx !== -1) { snake.dx = 1; snake.dy = 0; } break;
        case 'ArrowUp': if (snake.dy !== 1) { snake.dx = 0; snake.dy = -1; } break;
        case 'ArrowDown': if (snake.dy !== -1) { snake.dx = 0; snake.dy = 1; } break;
    }
});

// --- 啟動 ---
window.onload = function() {
    initGame();
    draw();
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(update, 100);
};