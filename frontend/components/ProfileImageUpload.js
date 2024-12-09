import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@goorm-dev/vapor-core';
import { Alert } from '@goorm-dev/vapor-components';
import { Camera, X } from 'lucide-react';
import authService from '../services/authService';
import PersistentAvatar from './common/PersistentAvatar';

const ProfileImageUpload = ({ currentImage, onImageChange }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // 프로필 이미지 URL 생성
  const getProfileImageUrl = (imagePath) => {
    if (!imagePath) return null;
    return imagePath.startsWith('http') ? 
      imagePath : 
      `${process.env.NEXT_PUBLIC_API_URL}${imagePath}`;
  };

  // 컴포넌트 마운트 시 이미지 설정
  useEffect(() => {
    const imageUrl = getProfileImageUrl(currentImage);
    setPreviewUrl(imageUrl);
  }, [currentImage]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // 이미지 파일 검증
      if (!file.type.startsWith('image/')) {
        throw new Error('이미지 파일만 업로드할 수 있습니다.');
      }

      // 파일 크기 제한 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('파일 크기는 5MB를 초과할 수 없습니다.');
      }

      setUploading(true);
      setError('');

      // 파일 미리보기 생성
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // 현재 사용자의 인증 정보 가져오기
      const user = authService.getCurrentUser();
      if (!user?.token) {
        throw new Error('인증 정보가 없습니다.');
      }

      // FormData 생성
      const formData = new FormData();
      formData.append('profileImage', file);

      // 파일 업로드 요청
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/profile-image`, {
        method: 'POST',
        headers: {
          'x-auth-token': user.token,
          'x-session-id': user.sessionId
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '이미지 업로드에 실패했습니다.');
      }

      const data = await response.json();
      
      // 로컬 스토리지의 사용자 정보 업데이트
      const updatedUser = {
        ...user,
        profileImage: data.imageUrl
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // 부모 컴포넌트에 변경 알림
      onImageChange(data.imageUrl);

      // 전역 이벤트 발생
      window.dispatchEvent(new Event('userProfileUpdate'));

    } catch (error) {
      console.error('Image upload error:', error);
      setError(error.message);
      setPreviewUrl(getProfileImageUrl(currentImage));
      
      // 기존 objectUrl 정리
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async () => {
    try {
      setUploading(true);
      setError('');

      const user = authService.getCurrentUser();
      if (!user?.token) {
        throw new Error('인증 정보가 없습니다.');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/profile-image`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': user.token,
          'x-session-id': user.sessionId
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '이미지 삭제에 실패했습니다.');
      }

      // 로컬 스토리지의 사용자 정보 업데이트
      const updatedUser = {
        ...user,
        profileImage: ''
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // 기존 objectUrl 정리
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }

      setPreviewUrl(null);
      onImageChange('');

      // 전역 이벤트 발생
      window.dispatchEvent(new Event('userProfileUpdate'));

    } catch (error) {
      console.error('Image removal error:', error);
      setError(error.message);
    } finally {
      setUploading(false);
    }
  };

  // 컴포넌트 언마운트 시 cleanup
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // 현재 사용자 정보
  const currentUser = authService.getCurrentUser();

  return (
    <div>
      <div>
        <PersistentAvatar
          user={currentUser}
          size="xl"
          className="w-24 h-24 mx-auto mb-6"
          showInitials={true}
        />
        
        <div className="mt-6">
          <Button
            size="md"
            color="secondary"
            className="rounded-full p-2 mt-3"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Camera className="w-4 h-4" />
          </Button>

          {previewUrl && (
            <Button
              size="md"
              color="danger"
              className="rounded-full p-2 mt-3 ml-2"
              onClick={handleRemoveImage}
              disabled={uploading}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleFileSelect}
      />

      {error && (
        <div className="w-full max-w-sm mx-auto">
          <Alert variant="danger" className="mt-2">
            {error}
          </Alert>
        </div>
      )}

      {uploading && (
        <div className="text-sm text-gray-500 text-center mt-2">
          이미지 업로드 중...
        </div>
      )}
    </div>
  );
};

export default ProfileImageUpload;