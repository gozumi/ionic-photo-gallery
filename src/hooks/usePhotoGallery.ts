import { Camera, CameraResultType, CameraSource, type Photo } from '@capacitor/camera';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { useEffect, useState } from 'react';

export interface UserPhoto {
  filepath: string;
  webviewPath?: string;
}

const PHOTO_STORAGE = 'photos';

export function usePhotoGallery() {
  const [photos, setPhotos] = useState<UserPhoto[]>([]);

  useEffect(() => {
    const loadSaved = async () => {
      const { value } = await Preferences.get({ key: PHOTO_STORAGE });
      const photosInPreferences = (value ? JSON.parse(value) : []) as UserPhoto[];

      for (const photo of photosInPreferences) {
        const file = await Filesystem.readFile({
          path: photo.filepath,
          directory: Directory.Data,
        });
        photo.webviewPath = `data:image/jpeg;base64,${file.data}`;
      }
      setPhotos(photosInPreferences);
    };
    loadSaved();
  }, []);

  const takePhoto = async () => {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100,
    });

    const fileName = `${Date.now()}.jpeg`;

    const savedFileImage = await savePicture(photo, fileName);
    const newPhotos = [savedFileImage, ...photos];

    setPhotos(newPhotos);
    Preferences.set({
      key: PHOTO_STORAGE,
      value: JSON.stringify(newPhotos),
    });
  };

  return { photos, takePhoto };
}

async function savePicture(photo: Photo, fileName: string): Promise<UserPhoto> {
  const base64Data = await base64FromPath(photo.webPath!);
  const savedFile = await Filesystem.writeFile({
    path: fileName,
    data: base64Data,
    directory: Directory.Data,
  });

  return {
    filepath: fileName,
    webviewPath: photo.webPath,
  };
}

async function base64FromPath(path: string): Promise<string> {
  const response = await fetch(path);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject('Could not convert blob to base64.');
      }
    };
    reader.readAsDataURL(blob);
  });
}
