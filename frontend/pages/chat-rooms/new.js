import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card } from '@goorm-dev/vapor-core';
import { 
  Button, 
  Input, 
  Text,
  Alert,
  Switch,
  FormGroup,
  Label
} from '@goorm-dev/vapor-components';
import { AlertCircle } from 'lucide-react';
import authService from '../../services/authService';

function NewChatRoom() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    hasPassword: false,
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      router.push('/');
      return;
    }
    setCurrentUser(user);
  }, [router]);

  const joinRoom = async (roomId, password) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': currentUser.token,
          'x-session-id': currentUser.sessionId
        },
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '채팅방 입장에 실패했습니다.');
      }

      // 채팅방으로 이동
      router.push(`/chat?room=${roomId}`);
    } catch (error) {
      console.error('Room join error:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('채팅방 이름을 입력해주세요.');
      return;
    }

    if (formData.hasPassword && !formData.password) {
      setError('비밀번호를 입력해주세요.');
      return;
    }

    if (!currentUser?.token) {
      setError('인증 정보가 없습니다. 다시 로그인해주세요.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // 채팅방 생성
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': currentUser.token,
          'x-session-id': currentUser.sessionId
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          password: formData.hasPassword ? formData.password : undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          try {
            await authService.refreshToken();
            const updatedUser = authService.getCurrentUser();
            if (updatedUser) {
              setCurrentUser(updatedUser);
              return handleSubmit(e);
            }
          } catch (refreshError) {
            throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
          }
        }
        throw new Error(errorData.message || '채팅방 생성에 실패했습니다.');
      }

      const { data } = await response.json();
      
      // 생성된 채팅방에 자동으로 입장
      await joinRoom(data._id, formData.hasPassword ? formData.password : undefined);

    } catch (error) {
      console.error('Room creation/join error:', error);
      setError(error.message);
      
      if (error.message.includes('인증') || error.message.includes('만료')) {
        authService.logout();
        router.push('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchChange = (e) => {
    const checked = e.target.checked;
    setFormData(prev => ({
      ...prev,
      hasPassword: checked,
      password: checked ? prev.password : ''
    }));
  };

  return (
    <div className="auth-container">
      <Card className="auth-card">
        <Card.Header>
          <Text as="h5" typography="heading5">새 채팅방</Text>
        </Card.Header>
        <Card.Body className="p-8">

          {error && (
            <Alert
              color="danger"
              className="mb-6"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <FormGroup>
              <Label for="roomName">채팅방 이름</Label>
              <Input
                id="roomName"
                name="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  name: e.target.value
                }))}
                placeholder="채팅방 이름을 입력하세요"
                disabled={loading}
              />
            </FormGroup>

            <FormGroup>
              <div className="d-flex justify-content-between align-items-center">
                <Label for="hasPassword" inline>
                  비밀번호 설정
                </Label>
                <Switch
                  id="hasPassword"
                  checked={formData.hasPassword}
                  onChange={handleSwitchChange}
                  disabled={loading}
                />
              </div>
            </FormGroup>

            {formData.hasPassword && (
              <FormGroup>
                <Label for="roomPassword">비밀번호</Label>
                <Input
                  id="roomPassword"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    password: e.target.value
                  }))}
                  placeholder="비밀번호를 입력하세요"
                  disabled={loading}
                />
              </FormGroup>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading || !formData.name.trim() || (formData.hasPassword && !formData.password)}
            >
              {loading ? '생성 중...' : '채팅방 만들기'}
            </Button>
          </form>
        </Card.Body>
      </Card>
    </div>
  );
}

export default NewChatRoom;