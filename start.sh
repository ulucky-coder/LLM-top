#!/bin/bash
# LLM-top: Start All Services
# Usage: ./start.sh [start|stop|status|restart]

PROJECT_DIR="/root/projects/LLM-top"
cd "$PROJECT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() { echo -e "${BLUE}[LLM-top]${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }
warn() { echo -e "${YELLOW}!${NC} $1"; }

# PID files
API_PID="$PROJECT_DIR/.api.pid"
BOT_PID="$PROJECT_DIR/.bot.pid"
WEB_PID="$PROJECT_DIR/.web.pid"

start_api() {
    log "Starting API server..."
    if [ -f "$API_PID" ] && kill -0 $(cat "$API_PID") 2>/dev/null; then
        warn "API server already running (PID: $(cat $API_PID))"
        return
    fi
    source "$PROJECT_DIR/venv/bin/activate"
    nohup python main.py > "$PROJECT_DIR/logs/api.log" 2>&1 &
    echo $! > "$API_PID"
    sleep 2
    if curl -s http://localhost:8000/health > /dev/null; then
        success "API server started on http://localhost:8000"
    else
        error "API server failed to start"
    fi
}

start_bot() {
    log "Starting Telegram bot..."
    if [ -f "$BOT_PID" ] && kill -0 $(cat "$BOT_PID") 2>/dev/null; then
        warn "Telegram bot already running (PID: $(cat $BOT_PID))"
        return
    fi
    source "$PROJECT_DIR/venv/bin/activate"
    nohup python run_bot.py > "$PROJECT_DIR/logs/bot.log" 2>&1 &
    echo $! > "$BOT_PID"
    sleep 2
    if kill -0 $(cat "$BOT_PID") 2>/dev/null; then
        success "Telegram bot started (@Analitik_77bot)"
    else
        error "Telegram bot failed to start"
    fi
}

start_web() {
    log "Starting web interface..."
    if [ -f "$WEB_PID" ] && kill -0 $(cat "$WEB_PID") 2>/dev/null; then
        warn "Web interface already running (PID: $(cat $WEB_PID))"
        return
    fi
    cd "$PROJECT_DIR/web"
    nohup npm run start -- -p 3000 > "$PROJECT_DIR/logs/web.log" 2>&1 &
    echo $! > "$WEB_PID"
    cd "$PROJECT_DIR"
    sleep 3
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
        success "Web interface started on http://localhost:3000"
    else
        error "Web interface failed to start"
    fi
}

stop_service() {
    local name=$1
    local pid_file=$2
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 $pid 2>/dev/null; then
            kill $pid 2>/dev/null
            sleep 1
            kill -9 $pid 2>/dev/null
            success "$name stopped"
        fi
        rm -f "$pid_file"
    fi
}

stop_all() {
    log "Stopping all services..."
    stop_service "API server" "$API_PID"
    stop_service "Telegram bot" "$BOT_PID"
    stop_service "Web interface" "$WEB_PID"
    # Also kill by port
    fuser -k 8000/tcp 2>/dev/null
    fuser -k 3000/tcp 2>/dev/null
    pkill -f "run_bot.py" 2>/dev/null
    success "All services stopped"
}

status() {
    echo ""
    echo "═══════════════════════════════════════"
    echo "         LLM-top Service Status        "
    echo "═══════════════════════════════════════"
    echo ""

    # API
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        success "API Server     :8000  [RUNNING]"
    else
        error "API Server     :8000  [STOPPED]"
    fi

    # Bot
    if [ -f "$BOT_PID" ] && kill -0 $(cat "$BOT_PID") 2>/dev/null; then
        success "Telegram Bot          [RUNNING] @Analitik_77bot"
    else
        error "Telegram Bot          [STOPPED]"
    fi

    # Web
    if curl -s -o /dev/null http://localhost:3000 2>/dev/null; then
        success "Web Interface  :3000  [RUNNING]"
    else
        error "Web Interface  :3000  [STOPPED]"
    fi

    echo ""
    echo "═══════════════════════════════════════"
}

start_all() {
    echo ""
    echo "🧠 LLM-top - Starting All Services"
    echo "═══════════════════════════════════════"
    echo ""

    # Create logs directory
    mkdir -p "$PROJECT_DIR/logs"

    start_api
    start_bot
    start_web

    echo ""
    echo "═══════════════════════════════════════"
    echo ""
    log "All services started!"
    echo ""
    echo "  API:      http://localhost:8000"
    echo "  Web:      http://localhost:3000"
    echo "  Telegram: @Analitik_77bot"
    echo ""
    echo "  Logs:     $PROJECT_DIR/logs/"
    echo ""
    echo "  Stop:     ./start.sh stop"
    echo "  Status:   ./start.sh status"
    echo ""
}

# Main
case "${1:-start}" in
    start)
        start_all
        ;;
    stop)
        stop_all
        ;;
    restart)
        stop_all
        sleep 2
        start_all
        ;;
    status)
        status
        ;;
    api)
        start_api
        ;;
    bot)
        start_bot
        ;;
    web)
        start_web
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|api|bot|web}"
        exit 1
        ;;
esac
