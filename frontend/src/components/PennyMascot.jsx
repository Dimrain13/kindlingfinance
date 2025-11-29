import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { X, TrendingUp, Award, Zap } from 'lucide-react';

const PennyMascot = () => {
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState('');
  const [showMascot, setShowMascot] = useState(true);
  const [showAchievements, setShowAchievements] = useState(false);

  useEffect(() => {
    loadProfile();
    performCheckIn();
  }, []);

  const loadProfile = async () => {
    try {
      const [profileRes, messageRes] = await Promise.all([
        api.get('/gamification/profile'),
        api.get('/gamification/mascot-message')
      ]);
      setProfile(profileRes.data);
      setMessage(messageRes.data.message);
    } catch (error) {
      console.error('Failed to load gamification profile:', error);
    }
  };

  const performCheckIn = async () => {
    try {
      await api.post('/gamification/check-in');
      // Reload profile after check-in
      setTimeout(loadProfile, 500);
    } catch (error) {
      console.error('Failed to check in:', error);
    }
  };

  if (!showMascot || !profile) return null;

  const progressPercent = ((500 - profile.points_to_next_level) / 500) * 100;

  return (
    <>
      {/* Floating Mascot Widget */}
      <div className="fixed bottom-6 right-6 z-50">
        <Card className="w-80 shadow-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="absolute -top-3 -right-3">
            <Button
              onClick={() => setShowMascot(false)}
              size="sm"
              variant="ghost"
              className="h-6 w-6 rounded-full bg-white shadow-md hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <CardContent className="p-4">
            {/* Mascot Avatar */}
            <div className="flex items-start gap-3 mb-3">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-4xl shadow-lg transform hover:scale-110 transition-transform cursor-pointer">
                  🦉
                </div>
                {profile.current_streak > 0 && (
                  <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                    🔥
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-gray-900">Sage the Owl</h3>
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                    <Award className="h-3 w-3" />
                    Lvl {profile.level}
                  </div>
                </div>
                <div className="text-xs text-gray-600">Your Financial Guide</div>
              </div>
            </div>

            {/* Message */}
            <div className="bg-white rounded-lg p-3 mb-3 shadow-sm border border-blue-100">
              <p className="text-sm text-gray-700 leading-relaxed">{message}</p>
            </div>

            {/* Level Progress */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600 font-medium">Level {profile.level} Progress</span>
                <span className="text-orange-600 font-bold">{profile.points_to_next_level} to next level</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-white rounded-lg p-2 text-center shadow-sm border border-gray-100">
                <div className="text-lg font-bold text-orange-600">{profile.total_points}</div>
                <div className="text-xs text-gray-600">Points</div>
              </div>
              <div className="bg-white rounded-lg p-2 text-center shadow-sm border border-orange-100">
                <div className="text-lg font-bold text-orange-600 flex items-center justify-center gap-1">
                  <Zap className="h-4 w-4" />
                  {profile.current_streak}
                </div>
                <div className="text-xs text-gray-600">Day Streak</div>
              </div>
              <div className="bg-white rounded-lg p-2 text-center shadow-sm border border-green-100">
                <div className="text-lg font-bold text-green-600">{profile.unlocked_achievements.length}</div>
                <div className="text-xs text-gray-600">Badges</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={() => setShowAchievements(true)}
                size="sm"
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
              >
                <Award className="h-4 w-4 mr-1" />
                Achievements
              </Button>
              <Button
                onClick={performCheckIn}
                size="sm"
                variant="outline"
                className="flex-1 border-blue-300 text-amber-600 hover:bg-blue-50"
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Check Stats
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Achievements Modal */}
      {showAchievements && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-white">
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-6 w-6" />
                <h2 className="text-xl font-bold">Your Achievements</h2>
              </div>
              <Button
                onClick={() => setShowAchievements(false)}
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.available_achievements.map((achievement) => {
                  const isUnlocked = profile.unlocked_achievements.includes(achievement.id);
                  const progress = profile.achievement_progress?.[achievement.id] || 0;

                  return (
                    <div
                      key={achievement.id}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        isUnlocked
                          ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300 shadow-md'
                          : 'bg-gray-50 border-gray-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`text-4xl ${isUnlocked ? 'animate-bounce' : 'grayscale'}`}>
                          {achievement.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            {achievement.name}
                            {isUnlocked && <span className="text-xs text-green-600">✓ Unlocked</span>}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">{achievement.description}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-orange-600">+{achievement.points} points</span>
                            {!isUnlocked && progress > 0 && (
                              <span className="text-xs text-gray-500">{progress}% complete</span>
                            )}
                          </div>
                          {!isUnlocked && progress > 0 && (
                            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default PennyMascot;
