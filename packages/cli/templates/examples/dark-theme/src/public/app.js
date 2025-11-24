// Task Manager - Simple task tracking
let tasks = [];
let taskIdCounter = 1;

const taskInput = document.getElementById('taskInput');
const addButton = document.getElementById('addButton');
const taskList = document.getElementById('taskList');
const taskCount = document.getElementById('taskCount');

// Add task on button click
addButton.addEventListener('click', addTask);

// Add task on Enter key
taskInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addTask();
  }
});

function addTask() {
  const text = taskInput.value.trim();
  
  if (!text) {
    return;
  }

  const task = {
    id: taskIdCounter++,
    text: text,
    completed: false
  };

  tasks.push(task);
  taskInput.value = '';
  
  renderTasks();
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    renderTasks();
  }
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  renderTasks();
}

function renderTasks() {
  // Clear list
  taskList.innerHTML = '';

  // Show empty state if no tasks
  if (tasks.length === 0) {
    taskList.innerHTML = '<div class="empty-state">No tasks yet. Add one above to get started!</div>';
    taskCount.textContent = '0 tasks';
    return;
  }

  // Render each task
  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;
    
    li.innerHTML = `
      <div class="task-content">
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
               onchange="toggleTask(${task.id})">
        <span class="task-text">${escapeHtml(task.text)}</span>
      </div>
      <button class="delete-button" onclick="deleteTask(${task.id})">Delete</button>
    `;
    
    taskList.appendChild(li);
  });

  // Update count
  const remaining = tasks.filter(t => !t.completed).length;
  taskCount.textContent = `${remaining} task${remaining !== 1 ? 's' : ''} remaining`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initial render
renderTasks();
