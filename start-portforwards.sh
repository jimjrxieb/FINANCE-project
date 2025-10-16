#!/bin/bash
# Helper script to manage port-forwards for FINANCE-project
# Usage: ./start-portforwards.sh [start|stop|status]

ACTION=${1:-start}

case $ACTION in
  start)
    echo "🔄 Killing any existing port-forwards..."
    killall -9 kubectl 2>/dev/null
    sleep 2

    echo "🚀 Starting port-forwards..."
    kubectl port-forward -n securebank service/securebank-frontend-service 8080:3001 > /tmp/pf-frontend.log 2>&1 &
    PF_FRONTEND=$!
    kubectl port-forward -n securebank service/securebank-backend-service 8001:3000 > /tmp/pf-backend.log 2>&1 &
    PF_BACKEND=$!

    sleep 3

    echo "✅ Port-forwards started:"
    echo "   Frontend PID: $PF_FRONTEND (localhost:8080 → service:3001)"
    echo "   Backend PID:  $PF_BACKEND (localhost:8001 → service:3000)"
    echo ""
    echo "📝 To stop: ./start-portforwards.sh stop"
    echo "📊 To check status: ./start-portforwards.sh status"
    echo ""
    echo "🔗 Access:"
    echo "   Dashboard: http://localhost:8080"
    echo "   API:       http://localhost:8001"
    ;;

  stop)
    echo "🛑 Stopping all port-forwards..."
    killall -9 kubectl 2>/dev/null
    sleep 1
    echo "✅ All port-forwards stopped"
    ;;

  status)
    echo "📊 Port-forward status:"
    PF_COUNT=$(ps aux | grep "kubectl port-forward" | grep -v grep | wc -l)
    echo "   Running processes: $PF_COUNT"

    if [ $PF_COUNT -gt 0 ]; then
      ps aux | grep "kubectl port-forward" | grep -v grep | awk '{print "   PID " $2 ": " $11 " " $12 " " $13 " " $14 " " $15}'
    fi

    echo ""
    echo "🔍 Testing connectivity:"
    FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 2>/dev/null)
    BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/health 2>/dev/null)

    if [ "$FRONTEND_STATUS" = "200" ]; then
      echo "   ✅ Frontend: accessible (HTTP 200)"
    else
      echo "   ❌ Frontend: not accessible (HTTP $FRONTEND_STATUS)"
    fi

    if [ "$BACKEND_STATUS" = "200" ]; then
      echo "   ✅ Backend: accessible (HTTP 200)"
    else
      echo "   ❌ Backend: not accessible (HTTP $BACKEND_STATUS)"
    fi
    ;;

  *)
    echo "Usage: $0 [start|stop|status]"
    exit 1
    ;;
esac
