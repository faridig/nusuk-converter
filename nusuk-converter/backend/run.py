# backend/run.py

# --- MODIFICATION ---
# Appliquer le monkey-patching de gevent AU TOUT DÉBUT.
# Ceci doit être fait avant l'importation de presque tout le reste.
from gevent import monkey
monkey.patch_all()
# --- FIN DE LA MODIFICATION ---

from app import create_app

# Crée l'application Flask pour Gunicorn
app = create_app()

# Optionnel : pour lancer en local sans gunicorn
if __name__ == '__main__':
    app.run(debug=True)