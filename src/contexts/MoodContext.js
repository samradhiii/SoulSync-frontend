import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';

// Initial state
const initialState = {
  currentMood: null,
  moodHistory: [],
  moodStats: null,
  moodPatterns: null,
  loading: false,
  error: null,
};

// Action types
const MOOD_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_CURRENT_MOOD: 'SET_CURRENT_MOOD',
  SET_MOOD_HISTORY: 'SET_MOOD_HISTORY',
  SET_MOOD_STATS: 'SET_MOOD_STATS',
  SET_MOOD_PATTERNS: 'SET_MOOD_PATTERNS',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  ADD_MOOD_ENTRY: 'ADD_MOOD_ENTRY',
  UPDATE_MOOD_ENTRY: 'UPDATE_MOOD_ENTRY',
};

// Reducer
const moodReducer = (state, action) => {
  switch (action.type) {
    case MOOD_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };
    case MOOD_ACTIONS.SET_CURRENT_MOOD:
      return {
        ...state,
        currentMood: action.payload,
        loading: false,
        error: null,
      };
    case MOOD_ACTIONS.SET_MOOD_HISTORY:
      return {
        ...state,
        moodHistory: action.payload,
        loading: false,
        error: null,
      };
    case MOOD_ACTIONS.SET_MOOD_STATS:
      return {
        ...state,
        moodStats: action.payload,
        loading: false,
        error: null,
      };
    case MOOD_ACTIONS.SET_MOOD_PATTERNS:
      return {
        ...state,
        moodPatterns: action.payload,
        loading: false,
        error: null,
      };
    case MOOD_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    case MOOD_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
    case MOOD_ACTIONS.ADD_MOOD_ENTRY:
      return {
        ...state,
        moodHistory: [action.payload, ...state.moodHistory],
      };
    case MOOD_ACTIONS.UPDATE_MOOD_ENTRY:
      return {
        ...state,
        moodHistory: state.moodHistory.map(entry =>
          entry.id === action.payload.id ? action.payload : entry
        ),
      };
    default:
      return state;
  }
};

// Create context
const MoodContext = createContext();

// Mood provider component
export const MoodProvider = ({ children }) => {
  const [state, dispatch] = useReducer(moodReducer, initialState);
  const { user } = useAuth();
  const { setMoodTheme, clearMoodTheme, animations } = useTheme();
  const inFlight = useRef({ current: false, history: false, stats: false, patterns: false });
  const cancelTokensRef = useRef([]);

  const makeCancelSource = () => {
    const source = axios.CancelToken.source();
    cancelTokensRef.current.push(source);
    return source;
  };

  // Fetch current mood
  const fetchCurrentMood = async () => {
    if (!user) return;
    if (inFlight.current) { /* noop for legacy check */ }
    if (inFlight.current.current) return; // avoid concurrent calls
    const cancelSource = makeCancelSource();
    inFlight.current.current = true;

    dispatch({ type: MOOD_ACTIONS.SET_LOADING, payload: true });
    try {
      const response = await axios.get('/api/mood/current', { cancelToken: cancelSource.token });
      dispatch({
        type: MOOD_ACTIONS.SET_CURRENT_MOOD,
        payload: response.data.data,
      });
    } catch (error) {
      if (!axios.isCancel(error)) {
        dispatch({
          type: MOOD_ACTIONS.SET_ERROR,
          payload: error.response?.data?.message || 'Failed to fetch current mood',
        });
      }
    } finally {
      inFlight.current.current = false;
    }
  };

  // Fetch mood history
  const fetchMoodHistory = async (days = 30) => {
    if (!user) return;
    if (inFlight.current.history) return;
    const cancelSource = makeCancelSource();
    inFlight.current.history = true;

    dispatch({ type: MOOD_ACTIONS.SET_LOADING, payload: true });
    try {
      const response = await axios.get(`/api/mood/trend?days=${days}` , { cancelToken: cancelSource.token });
      dispatch({
        type: MOOD_ACTIONS.SET_MOOD_HISTORY,
        payload: response.data.data.trend,
      });
    } catch (error) {
      if (!axios.isCancel(error)) {
        dispatch({
          type: MOOD_ACTIONS.SET_ERROR,
          payload: error.response?.data?.message || 'Failed to fetch mood history',
        });
      }
    } finally {
      inFlight.current.history = false;
    }
  };

  // Fetch mood statistics
  const fetchMoodStats = async (days = 30) => {
    if (!user) return;
    if (inFlight.current.stats) return;
    const cancelSource = makeCancelSource();
    inFlight.current.stats = true;

    dispatch({ type: MOOD_ACTIONS.SET_LOADING, payload: true });
    try {
      const response = await axios.get(`/api/mood/stats?days=${days}`, { cancelToken: cancelSource.token });
      dispatch({
        type: MOOD_ACTIONS.SET_MOOD_STATS,
        payload: response.data.data.stats,
      });
    } catch (error) {
      if (!axios.isCancel(error)) {
        dispatch({
          type: MOOD_ACTIONS.SET_ERROR,
          payload: error.response?.data?.message || 'Failed to fetch mood statistics',
        });
      }
    } finally {
      inFlight.current.stats = false;
    }
  };

  // Fetch mood patterns
  const fetchMoodPatterns = async (days = 30) => {
    if (!user) return;
    if (inFlight.current.patterns) return;
    const cancelSource = makeCancelSource();
    inFlight.current.patterns = true;

    dispatch({ type: MOOD_ACTIONS.SET_LOADING, payload: true });
    try {
      const response = await axios.get(`/api/mood/patterns?days=${days}`, { cancelToken: cancelSource.token });
      dispatch({
        type: MOOD_ACTIONS.SET_MOOD_PATTERNS,
        payload: response.data.data.patterns,
      });
    } catch (error) {
      if (!axios.isCancel(error)) {
        dispatch({
          type: MOOD_ACTIONS.SET_ERROR,
          payload: error.response?.data?.message || 'Failed to fetch mood patterns',
        });
      }
    } finally {
      inFlight.current.patterns = false;
    }
  };

  // Update mood for an entry
  const updateMood = async (moodId, moodData) => {
    try {
      const response = await axios.put(`/api/mood/${moodId}`, moodData);
      dispatch({
        type: MOOD_ACTIONS.UPDATE_MOOD_ENTRY,
        payload: response.data.data.mood,
      });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update mood';
      dispatch({
        type: MOOD_ACTIONS.SET_ERROR,
        payload: message,
      });
      return { success: false, error: message };
    }
  };

  // Add mood entry (when creating a journal entry)
  const addMoodEntry = (moodData) => {
    dispatch({
      type: MOOD_ACTIONS.ADD_MOOD_ENTRY,
      payload: moodData,
    });
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: MOOD_ACTIONS.CLEAR_ERROR });
  };

  // Get mood color
  const getMoodColor = (mood) => {
    const colors = {
      happy: '#FFD700',
      sad: '#4169E1',
      angry: '#DC143C',
      anxious: '#FF8C00',
      excited: '#FF1493',
      calm: '#20B2AA',
      grateful: '#32CD32',
      lonely: '#708090',
      confused: '#9370DB',
      neutral: '#808080',
    };
    return colors[mood] || colors.neutral;
  };

  // Get mood emoji
  const getMoodEmoji = (mood) => {
    const emojis = {
      happy: '😊',
      sad: '😢',
      angry: '😠',
      anxious: '😰',
      excited: '🤩',
      calm: '😌',
      grateful: '🙏',
      lonely: '😔',
      confused: '😕',
      neutral: '😐',
    };
    return emojis[mood] || emojis.neutral;
  };

  // Get mood description
  const getMoodDescription = (mood) => {
    const descriptions = {
      happy: 'Feeling joyful and positive',
      sad: 'Feeling down or melancholy',
      angry: 'Feeling frustrated or irritated',
      anxious: 'Feeling worried or nervous',
      excited: 'Feeling enthusiastic and energetic',
      calm: 'Feeling peaceful and relaxed',
      grateful: 'Feeling thankful and appreciative',
      lonely: 'Feeling isolated or disconnected',
      confused: 'Feeling uncertain or puzzled',
      neutral: 'Feeling balanced and stable',
    };
    return descriptions[mood] || descriptions.neutral;
  };

  // Get mood recommendation
  const getMoodRecommendation = (mood) => {
    const recommendations = {
      happy: 'Keep up the positive energy! Consider sharing your joy with others.',
      sad: 'It\'s okay to feel sad. Consider reaching out to friends or doing something you enjoy.',
      angry: 'Take some deep breaths. Physical activity or meditation might help.',
      anxious: 'Try some relaxation techniques like deep breathing or mindfulness.',
      excited: 'Channel this energy into something productive or creative!',
      calm: 'This peaceful state is perfect for reflection and planning.',
      grateful: 'Gratitude is powerful! Consider writing down what you\'re thankful for.',
      lonely: 'Reach out to friends or family. You\'re not alone.',
      confused: 'Take time to process your thoughts. Journaling can help clarify things.',
      neutral: 'A balanced state. Perfect time for self-reflection.',
    };
    return recommendations[mood] || recommendations.neutral;
  };

  // Load initial data when user is available
  useEffect(() => {
    // cancel any pending requests when user changes or component unmounts
    cancelTokensRef.current.forEach(src => src.cancel('component-updated'));
    cancelTokensRef.current = [];

    if (user) {
      fetchCurrentMood();
      fetchMoodHistory();
      fetchMoodStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Auto-update theme based on current mood WHEN animations toggle is enabled
  useEffect(() => {
    const moodString = typeof state.currentMood === 'string' ? state.currentMood : state.currentMood?.currentMood;
    if (animations && moodString && typeof setMoodTheme === 'function') {
      console.log('MoodContext: Applying mood theme (animations on):', moodString);
      setMoodTheme(moodString);
    } else if (!animations && typeof clearMoodTheme === 'function') {
      console.log('MoodContext: Animations off, clearing mood theme.');
      clearMoodTheme();
    }
  }, [animations, state.currentMood, setMoodTheme, clearMoodTheme]);

  const value = {
    currentMood: state.currentMood,
    moodHistory: state.moodHistory,
    moodStats: state.moodStats,
    moodPatterns: state.moodPatterns,
    loading: state.loading,
    error: state.error,
    fetchCurrentMood,
    fetchMoodHistory,
    fetchMoodStats,
    fetchMoodPatterns,
    updateMood,
    addMoodEntry,
    clearError,
    getMoodColor,
    getMoodEmoji,
    getMoodDescription,
    getMoodRecommendation,
  };

  return (
    <MoodContext.Provider value={value}>
      {children}
    </MoodContext.Provider>
  );
};

// Custom hook to use mood context
export const useMood = () => {
  const context = useContext(MoodContext);
  if (!context) {
    throw new Error('useMood must be used within a MoodProvider');
  }
  return context;
};

