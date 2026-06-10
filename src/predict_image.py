from pathlib import Path
import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image

MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "scenesense_model.keras"
CLASS_NAMES = ["buildings", "forest", "glacier", "mountain", "sea", "street"]


def predict_image(image_path: str):
    model = load_model(MODEL_PATH)
    img = image.load_img(image_path, target_size=(224, 224))
    img_array = image.img_to_array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)
    prediction = model.predict(img_array, verbose=0)[0]
    idx = int(np.argmax(prediction))
    return CLASS_NAMES[idx], float(prediction[idx])


if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Usage: python src/predict_image.py <image_path>")
        raise SystemExit(1)
    label, confidence = predict_image(sys.argv[1])
    print(f"Predicted label: {label} ({confidence:.2%})")
