"""
KisanSetu AI Wait-Time Prediction Service
Runs on port 8000 (Flask REST API)
Communicates with Node.js backend to provide intelligent queue wait estimations
"""

from flask import Flask, request, jsonify
from datetime import datetime
import os
import sys

# Ensure local imports work cleanly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from model import predictor

app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "KisanSetu AI Wait-Time Predictor",
        "model_fitted": predictor.is_fitted,
        "timestamp": datetime.now().isoformat()
    }), 200

@app.route('/predict', methods=['POST'])
def predict_wait_time():
    """
    POST payload schema:
    {
        "farmers_ahead": int,
        "avg_processing_mins": float,
        "active_counters": int,
        "produce_quantity_kg": float,
        "urgency": "NORMAL" | "URGENT" | "EMERGENCY",
        "perishability": "LOW" | "MEDIUM" | "HIGH",
        "hour_of_day": int (optional, defaults to current local hour)
    }
    """
    try:
        data = request.get_json(force=True, silent=True) or {}
        
        farmers_ahead = data.get('farmers_ahead', 0)
        avg_processing_mins = data.get('avg_processing_mins', 15.0)
        active_counters = data.get('active_counters', 3)
        produce_quantity_kg = data.get('produce_quantity_kg', 1000.0)
        urgency = data.get('urgency', 'NORMAL')
        perishability = data.get('perishability', 'MEDIUM')
        
        now = datetime.now()
        hour_of_day = data.get('hour_of_day', now.hour)

        result = predictor.predict(
            farmers_ahead=farmers_ahead,
            avg_processing_mins=avg_processing_mins,
            active_counters=active_counters,
            produce_kg=produce_quantity_kg,
            hour_of_day=hour_of_day,
            urgency=urgency,
            perishability=perishability
        )

        return jsonify({
            "status": "success",
            "data": result
        }), 200

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
            "fallback_estimated_wait_minutes": max(5, int(request.json.get('farmers_ahead', 1) * 15 / 3)) if request.is_json else 15
        }), 400

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    print(f"[KisanSetu AI] Service starting on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)
