from PIL import Image
import os
import io

# Pas besoin de changer quoi que ce soit ici, la fonction est déjà bien écrite !
def optimiser_image(chemin_entree, chemin_sortie, max_largeur, max_hauteur, max_taille_mo):
    """
    Redimensionne et compresse une image (JPG ou PNG) pour respecter les contraintes 
    de dimensions et de taille, en la sauvegardant toujours en JPG.
    """
    max_taille_octets = max_taille_mo * 1024 * 1024
    if not os.path.exists(chemin_entree):
        print(f"Erreur : Le fichier '{chemin_entree}' n'a pas été trouvé.")
        return None
    try:
        with Image.open(chemin_entree) as img:
            if img.mode == 'RGBA':
                background = Image.new('RGB', img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[3])
                img = background
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            original_width, original_height = img.size
            ratio = min(max_largeur / original_width, max_hauteur / original_height)

            if ratio < 1:
                new_width = int(original_width * ratio)
                new_height = int(original_height * ratio)
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

            buffer = io.BytesIO()
            qualite = 95
            while qualite > 10:
                buffer.seek(0)
                buffer.truncate()
                img.save(buffer, format='JPEG', quality=qualite, optimize=True)
                if buffer.tell() <= max_taille_octets:
                    break
                qualite -= 5
            
            with open(chemin_sortie, 'wb') as f:
                f.write(buffer.getvalue())
            return chemin_sortie
    except Exception as e:
        print(f"Une erreur est survenue : {e}")
        return None