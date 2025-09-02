import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Plus, List, FolderOpen, Brain, Target, Users } from 'lucide-react';

const Home: React.FC = () => {
  const features = [
    {
      icon: Brain,
      title: 'AI問題生成',
      description: 'OpenAIの最新技術を使用して、英検各級に適した問題を自動生成します。',
      color: 'bg-blue-500'
    },
    {
      icon: Target,
      title: '級別対応',
      description: '5級から1級まで、各級の難易度に合わせた問題を作成できます。',
      color: 'bg-green-500'
    },
    {
      icon: BookOpen,
      title: '多様な問題タイプ',
      description: '語彙、文法、読解、リスニング、英作文など、様々なタイプの問題に対応。',
      color: 'bg-purple-500'
    },
    {
      icon: Users,
      title: '教育者向け',
      description: '教師や塾講師が効率的に問題を作成し、生徒の学習をサポート。',
      color: 'bg-orange-500'
    }
  ];

  const quickActions = [
    {
      title: '問題を生成',
      description: '新しい問題をAIで自動生成',
      icon: Plus,
      path: '/generate',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      title: '問題を管理',
      description: '作成した問題の一覧と編集',
      icon: List,
      path: '/questions',
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      title: '問題セット',
      description: '問題をセットにして管理',
      icon: FolderOpen,
      path: '/question-sets',
      color: 'bg-purple-600 hover:bg-purple-700'
    }
  ];

  return (
    <div className="space-y-8">
      {/* ヒーローセクション */}
      <section className="text-center py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
          英検問題を
          <span className="text-blue-600">AI</span>で
          <br />
          自動制作
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          英検の各級に対応した問題を、AIが自動で生成します。
          教師や塾講師の作業効率を大幅に向上させ、質の高い問題を簡単に作成できます。
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/generate"
            className="btn-primary text-lg px-8 py-3 inline-flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>問題を生成する</span>
          </Link>
          <Link
            to="/questions"
            className="btn-secondary text-lg px-8 py-3 inline-flex items-center space-x-2"
          >
            <List className="w-5 h-5" />
            <span>問題を見る</span>
          </Link>
        </div>
      </section>

      {/* 機能紹介 */}
      <section className="py-12">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          主な機能
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="card text-center">
                <div className={`${feature.color} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* クイックアクション */}
      <section className="py-12">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          クイックアクション
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link
                key={index}
                to={action.path}
                className={`${action.color} text-white rounded-lg p-6 text-center transition-transform duration-200 hover:scale-105`}
              >
                <Icon className="w-12 h-12 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  {action.title}
                </h3>
                <p className="text-blue-100">
                  {action.description}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 対応級 */}
      <section className="py-12">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          対応する英検級
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {['5級', '4級', '3級', '準2級', '2級', '準1級', '1級'].map((level, index) => (
            <div key={level} className="card text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {level}
              </div>
              <div className="text-sm text-gray-600">
                {index < 3 ? '初級' : index < 5 ? '中級' : '上級'}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;

