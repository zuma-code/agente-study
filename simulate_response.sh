#!/bin/bash
# simulate_response.sh
BRIDGE_DIR=".bridge"
REQUEST_FILE="$BRIDGE_DIR/request.json"
RESPONSE_FILE="$BRIDGE_DIR/response.json"

echo "🧪 NotebookLM Simulator Started..."
echo "Waiting for requests in $REQUEST_FILE..."

while true; do
  if [ -f "$REQUEST_FILE" ]; then
    req_id=$(grep -o '"id":[[:space:]]*"[^"]*"' "$REQUEST_FILE" | cut -d'"' -f4)
    query=$(grep -o '"query":[[:space:]]*"[^"]*"' "$REQUEST_FILE" | cut -d'"' -f4)
    timestamp=$(grep -o '"timestamp":[[:space:]]*[0-9]*' "$REQUEST_FILE" | cut -d':' -f2 | tr -d '[:space:]')

    echo "📩 Received query: $query"
    echo "🤔 Generating response for $req_id..."
    
    sleep 2
    
    # Simple simulated response
    answer="Esta es una respuesta simulada para tu duda sobre: **$query**.

En el contexto de la AEAT, este concepto se regula en la Ley General Tributaria. 

### Puntos clave:
- Punto 1
- Punto 2

¿Quieres que profundice en algún aspecto?"
    
    cat <<EOF > "$RESPONSE_FILE"
{
  "requestId": "$req_id",
  "requestTimestamp": $timestamp,
  "answer": "$answer",
  "sources": ["Manual Gestión 2026", "LGT Art. 58"]
}
EOF
    echo "✅ Response sent."
    rm "$REQUEST_FILE"
  fi
  sleep 1
done
