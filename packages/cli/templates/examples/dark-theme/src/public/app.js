// Admin Dashboard - Interactive data visualization
// This is a starting point for adding dark theme support

// ============================================
// Initialize Charts
// ============================================

function initializeCharts() {
  // Revenue Chart
  const revenueCtx = document.getElementById('revenueChart');
  if (revenueCtx) {
    new Chart(revenueCtx, {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'Revenue',
          data: [4200, 5100, 4800, 6200, 5800, 7100, 6500],
          borderColor: '#0066cc',
          backgroundColor: 'rgba(0, 102, 204, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#0066cc',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            borderRadius: 8,
            titleColor: '#fff',
            bodyColor: '#fff',
            callbacks: {
              label: function(context) {
                return '$' + context.parsed.y.toLocaleString();
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              callback: function(value) {
                return '$' + value.toLocaleString();
              }
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }

  // Traffic Chart
  const trafficCtx = document.getElementById('trafficChart');
  if (trafficCtx) {
    new Chart(trafficCtx, {
      type: 'doughnut',
      data: {
        labels: ['Organic', 'Direct', 'Social', 'Referral'],
        datasets: [{
          data: [42, 28, 18, 12],
          backgroundColor: [
            '#0066cc',
            '#00a854',
            '#7c3aed',
            '#ff8c00'
          ],
          borderWidth: 0,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 16,
              usePointStyle: true,
              pointStyle: 'circle',
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            borderRadius: 8,
            titleColor: '#fff',
            bodyColor: '#fff',
            callbacks: {
              label: function(context) {
                return context.label + ': ' + context.parsed + '%';
              }
            }
          }
        }
      }
    });
  }
}

// ============================================
// Animate Stats on Load
// ============================================

function animateValue(element, start, end, duration) {
  const range = end - start;
  const increment = range / (duration / 16);
  let current = start;
  
  const timer = setInterval(() => {
    current += increment;
    if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
      element.textContent = formatStatValue(end);
      clearInterval(timer);
    } else {
      element.textContent = formatStatValue(Math.floor(current));
    }
  }, 16);
}

function formatStatValue(value) {
  if (value >= 1000) {
    return value.toLocaleString();
  }
  return value.toString();
}

function animateStats() {
  const stats = [
    { id: 'totalUsers', value: 2847 },
    { id: 'revenue', value: 45231, prefix: '$' },
    { id: 'completedTasks', value: 892 },
    { id: 'activeProjects', value: 24 }
  ];
  
  stats.forEach(stat => {
    const element = document.getElementById(stat.id);
    if (element) {
      if (stat.prefix) {
        const originalText = element.textContent;
        element.textContent = stat.prefix + '0';
        animateValue(element, 0, stat.value, 1000);
        const timer = setInterval(() => {
          if (element.textContent !== stat.prefix + '0') {
            const currentVal = element.textContent.replace(/[^0-9]/g, '');
            element.textContent = stat.prefix + Number(currentVal).toLocaleString();
          }
        }, 16);
        setTimeout(() => clearInterval(timer), 1000);
      } else {
        element.textContent = '0';
        animateValue(element, 0, stat.value, 1000);
      }
    }
  });
}

// ============================================
// Recent Activity
// ============================================

function loadRecentActivity() {
  const activities = [
    {
      type: 'user',
      title: 'New user registration',
      description: 'Sarah Johnson joined the platform',
      time: '5 minutes ago',
      icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 11C12.2091 11 14 9.20914 14 7C14 4.79086 12.2091 3 10 3C7.79086 3 6 4.79086 6 7C6 9.20914 7.79086 11 10 11Z" stroke="currentColor" stroke-width="2"/>
        <path d="M3 17C3 14.2386 5.23858 12 8 12H12C14.7614 12 17 14.2386 17 17" stroke="currentColor" stroke-width="2"/>
      </svg>`
    },
    {
      type: 'report',
      title: 'Monthly report generated',
      description: 'Q4 2024 performance summary is ready',
      time: '1 hour ago',
      icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M7 8H13M7 12H10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`
    },
    {
      type: 'alert',
      title: 'Server capacity warning',
      description: 'CPU usage exceeded 80% threshold',
      time: '3 hours ago',
      icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 6V10M10 14H10.01M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`
    },
    {
      type: 'user',
      title: 'Team member added',
      description: 'Michael Chen joined the Development team',
      time: '5 hours ago',
      icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 11C12.2091 11 14 9.20914 14 7C14 4.79086 12.2091 3 10 3C7.79086 3 6 4.79086 6 7C6 9.20914 7.79086 11 10 11Z" stroke="currentColor" stroke-width="2"/>
        <path d="M3 17C3 14.2386 5.23858 12 8 12H12C14.7614 12 17 14.2386 17 17" stroke="currentColor" stroke-width="2"/>
      </svg>`
    },
    {
      type: 'report',
      title: 'Backup completed',
      description: 'Database backup finished successfully',
      time: '8 hours ago',
      icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 12L9 18L21 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`
    }
  ];
  
  const activityList = document.getElementById('activityList');
  if (activityList) {
    activityList.innerHTML = activities.map(activity => `
      <div class="activity-item">
        <div class="activity-icon ${activity.type}">
          ${activity.icon}
        </div>
        <div class="activity-content">
          <div class="activity-title">${activity.title}</div>
          <div class="activity-description">${activity.description}</div>
          <div class="activity-time">${activity.time}</div>
        </div>
      </div>
    `).join('');
  }
}

// ============================================
// Initialize Dashboard
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Initialize all components
  animateStats();
  initializeCharts();
  loadRecentActivity();
  
  // Add subtle hover effects
  document.querySelectorAll('.stat-card').forEach(card => {
    card.addEventListener('mouseenter', (e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
    });
    card.addEventListener('mouseleave', (e) => {
      e.currentTarget.style.transform = 'translateY(0)';
    });
  });
  
  console.log('✓ Dashboard initialized');
  console.log('💡 Try adding dark theme support with CSS custom properties!');
});
