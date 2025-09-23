console.log("✅ org_dashboard.js is running");

document.addEventListener('DOMContentLoaded', function() {
    const isDarkMode = document.body.classList.contains('dark-theme') || document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;

    const getColor = (light, dark) => isDarkMode ? dark : light;

    const createLineChart = (canvasId, label) => {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
                datasets: [{
                    label,
                    data: Array.from({ length: 7 }, () => Math.floor(Math.random() * 100)),
                    borderColor: getColor('#4F46E5', '#818CF8'),
                    backgroundColor: getColor('rgba(99,102,241,0.15)', 'rgba(129,140,248,0.2)'),
                    fill: true,
                    tension: 0.5,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: getColor('#4F46E5', '#C7D2FE'),
                }]
            },
            options: {
                responsive: true,
                animation: {
                    duration: 2000,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: getColor('#111827', '#F9FAFB'),
                            font: {
                                size: 14,
                                weight: 'bold'
                            },
                            boxWidth: 12,
                            padding: 20
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: getColor('#1F2937', '#E5E7EB') // dark: light gray, light: dark gray
                        },
                        grid: {
                            color: getColor('rgba(0, 0, 0, 0.07)', 'rgba(255, 255, 255, 0.07)')
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: getColor('#1F2937', '#E5E7EB')
                        },
                        grid: {
                            color: getColor('rgba(0, 0, 0, 0.07)', 'rgba(255, 255, 255, 0.07)')
                        }
                    }
                }
            }
        });
    };

    const createBarChart = () => {
        const ctx = document.getElementById('coursePopularityChart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['CS101', 'MATH102', 'PHY201', 'ENG103', 'BIO202'],
                datasets: [{
                    label: 'Enrolled Students',
                    data: [120, 90, 75, 150, 60],
                    backgroundColor: [
                        '#3B82F6',
                        '#8B5CF6',
                        '#10B981',
                        '#F59E0B',
                        '#EF4444'
                    ],
                    borderRadius: 10,
                    barThickness: 40
                }]
            },
            options: {
                responsive: true,
                animation: {
                    duration: 1800,
                    easing: 'easeOutBack'
                },
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: getColor('#374151', '#D1D5DB')
                        },
                        grid: {
                            color: getColor('rgba(0,0,0,0.05)', 'rgba(255,255,255,0.1)')
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: getColor('#374151', '#D1D5DB')
                        },
                        grid: {
                            color: getColor('rgba(0,0,0,0.05)', 'rgba(255,255,255,0.1)')
                        }
                    }
                }
            }
        });
    };

    // Init all charts
    createLineChart('schoolAttendanceChart', 'University Attendance');
    createLineChart('collegeAttendanceChart', 'College Attendance');
    createLineChart('facultyAttendanceChart', 'Faculty Attendance');
    createLineChart('departmentAttendanceChart', 'Department Attendance');
    createBarChart();
});