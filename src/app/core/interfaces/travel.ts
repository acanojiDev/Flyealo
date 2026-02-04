export interface Travel {
  id: string;
  userInfo: UserInfo;
  created_at?: string;
  budget?: string;
  about: string;
  itinerary?: any;
  days: number;
  cities: string[];
  interests: string[];
  groqStatus: 'pending' | 'completed' | 'error';
  error_message?: string;
}

interface UserInfo {
  id: string;
  username?: string;
  [key: string]: any;
}
