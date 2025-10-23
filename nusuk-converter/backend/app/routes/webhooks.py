# backend/app/routes/webhooks.py
import stripe
from flask import Blueprint, request, jsonify, current_app
from ..models import db, Session

bp = Blueprint('webhooks', __name__)

@bp.route('/stripe', methods=['POST'])
def stripe_webhook():
    current_app.logger.info("--> [WEBHOOK] Appel reçu sur /api/webhooks/stripe")
    
    stripe.api_key = current_app.config['STRIPE_SECRET_KEY']
    payload = request.get_data(as_text=True)
    sig_header = request.headers.get('Stripe-Signature')
    endpoint_secret = current_app.config['STRIPE_WEBHOOK_SECRET']

    if not endpoint_secret:
        current_app.logger.error("--> [WEBHOOK] ERREUR CRITIQUE: STRIPE_WEBHOOK_SECRET n'est pas configuré.")
        return jsonify(error={"message": "Webhook secret not configured"}), 500

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
        current_app.logger.info(f"--> [WEBHOOK] Signature vérifiée. Type d'événement: {event['type']}")
    except ValueError as e:
        # Payload invalide
        current_app.logger.error(f"--> [WEBHOOK] ERREUR: Payload invalide. {e}")
        return jsonify(error={"message": "Invalid payload"}), 400
    except stripe.error.SignatureVerificationError as e:
        # Signature invalide
        current_app.logger.error(f"--> [WEBHOOK] ERREUR: Signature de webhook invalide. {e}")
        return jsonify(error={"message": "Invalid signature"}), 400

    # Gérer l'événement
    if event['type'] == 'payment_intent.succeeded':
        current_app.logger.info("--> [WEBHOOK] Événement 'payment_intent.succeeded' détecté.")
        payment_intent = event['data']['object']
        session_id = payment_intent['metadata'].get('session_id')
        
        if session_id:
            current_app.logger.info(f"--> [WEBHOOK] session_id trouvé dans les métadonnées: {session_id}")
            session = Session.query.get(session_id)
            if session:
                current_app.logger.info(f"--> [WEBHOOK] Session {session_id} trouvée en base. Statut 'paid' actuel: {session.paid}")
                if not session.paid:
                    session.paid = True
                    db.session.commit()
                    current_app.logger.info(f"--> [WEBHOOK] SUCCÈS ! Session {session_id} marquée comme payée et commit en base de données.")
                else:
                    current_app.logger.info(f"--> [WEBHOOK] Session {session_id} était déjà marquée comme payée. Aucune action nécessaire.")
            else:
                current_app.logger.warning(f"--> [WEBHOOK] ATTENTION ! Session {session_id} non trouvée en base de données pour le paiement.")
        else:
            current_app.logger.error("--> [WEBHOOK] ERREUR ! session_id manquant dans les métadonnées de PaymentIntent.")
    else:
        current_app.logger.info(f"--> [WEBHOOK] Événement '{event['type']}' reçu mais ignoré.")

    return jsonify(status="success"), 200