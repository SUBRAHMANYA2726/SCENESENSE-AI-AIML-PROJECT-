# SceneSense AI

SceneSense AI is an image classification project built for an AIML internship workflow. It uses TensorFlow and EfficientNet to classify images from the Intel Image Classification dataset into six categories: buildings, forest, glacier, mountain, sea, and street.

## Project structure

- `src/train_model.py` – downloads the dataset (if needed), trains the model, and saves plots and model artifacts.
- `src/predict_image.py` – loads the trained model and predicts the class for a single image.
- `requirements.txt` – Python dependencies for training and inference.
- `data/` – downloaded dataset files (ignored by Git).
- `models/` – trained model and generated plots (ignored by Git).

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Set your Kaggle credentials:
   ```bash
   export KAGGLE_USERNAME=your_username
   export KAGGLE_KEY=your_api_key
   ```
3. Train the model:
   ```bash
   python src/train_model.py
   ```

## Prediction example

```bash
python src/predict_image.py path/to/image.jpg
```

## Notes

- The training script uses a lightweight transfer-learning setup with EfficientNetB0.
- Large dataset files and trained model weights are intentionally excluded from the repository.
