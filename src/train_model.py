from pathlib import Path
import os
import shutil
import subprocess
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras.layers import Dense, Dropout, GlobalAveragePooling2D
from tensorflow.keras.models import Model
from sklearn.metrics import confusion_matrix

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
DATASET_ZIP = DATA_DIR / "intel-image-classification.zip"
EXTRACT_DIR = DATA_DIR / "intel"
TRAIN_DIR = EXTRACT_DIR / "seg_train" / "seg_train"
TEST_DIR = EXTRACT_DIR / "seg_test" / "seg_test"
MODEL_DIR = ROOT / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)


def download_dataset():
    if EXTRACT_DIR.exists() and (TRAIN_DIR.exists() or TEST_DIR.exists()):
        print("Dataset already available.")
        return

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not DATASET_ZIP.exists():
        kaggle_user = os.getenv("KAGGLE_USERNAME")
        kaggle_key = os.getenv("KAGGLE_KEY")
        if not kaggle_user or not kaggle_key:
            raise RuntimeError("Set KAGGLE_USERNAME and KAGGLE_KEY environment variables before training.")
        os.environ["KAGGLE_USERNAME"] = kaggle_user
        os.environ["KAGGLE_KEY"] = kaggle_key
        subprocess.run(
            ["kaggle", "datasets", "download", "-d", "puneet6060/intel-image-classification", "-p", str(DATA_DIR)],
            check=True,
        )
    if not EXTRACT_DIR.exists():
        shutil.unpack_archive(DATASET_ZIP, DATA_DIR)


def build_model():
    IMG_SIZE = 224
    BATCH_SIZE = 32
    train_datagen = ImageDataGenerator(
        rescale=1.0 / 255,
        validation_split=0.2,
        rotation_range=20,
        zoom_range=0.2,
        horizontal_flip=True,
    )

    train_generator = train_datagen.flow_from_directory(
        TRAIN_DIR,
        target_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        class_mode="categorical",
        subset="training",
    )
    val_generator = train_datagen.flow_from_directory(
        TRAIN_DIR,
        target_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        class_mode="categorical",
        subset="validation",
    )

    base_model = EfficientNetB0(weights="imagenet", include_top=False, input_shape=(224, 224, 3))
    base_model.trainable = False

    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dense(256, activation="relu")(x)
    x = Dropout(0.4)(x)
    output = Dense(len(train_generator.class_indices), activation="softmax")(x)

    model = Model(inputs=base_model.input, outputs=output)
    model.compile(optimizer="adam", loss="categorical_crossentropy", metrics=["accuracy"])

    history = model.fit(
        train_generator,
        validation_data=val_generator,
        epochs=10,
    )

    model.save(MODEL_DIR / "scenesense_model.keras")

    plt.figure(figsize=(10, 5))
    plt.plot(history.history["accuracy"], label="Training Accuracy")
    plt.plot(history.history["val_accuracy"], label="Validation Accuracy")
    plt.title("Training vs Validation Accuracy")
    plt.xlabel("Epoch")
    plt.ylabel("Accuracy")
    plt.legend()
    plt.grid(True)
    plt.savefig(MODEL_DIR / "accuracy_graph.png")
    plt.close()

    plt.figure(figsize=(10, 5))
    plt.plot(history.history["loss"], label="Training Loss")
    plt.plot(history.history["val_loss"], label="Validation Loss")
    plt.title("Training vs Validation Loss")
    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.legend()
    plt.grid(True)
    plt.savefig(MODEL_DIR / "loss_graph.png")
    plt.close()

    preds = model.predict(val_generator)
    pred_classes = np.argmax(preds, axis=1)
    true_classes = val_generator.classes
    cm = confusion_matrix(true_classes, pred_classes[: len(true_classes)])

    plt.figure(figsize=(8, 8))
    sns.heatmap(cm, annot=True, fmt="d")
    plt.title("Confusion Matrix")
    plt.savefig(MODEL_DIR / "confusion_matrix.png")
    plt.close()

    print("Training complete. Model saved to", MODEL_DIR / "scenesense_model.keras")


if __name__ == "__main__":
    download_dataset()
    build_model()
