export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 min-h-screen">
      <div className="max-w-md w-full text-center space-y-6 animate-fade-in-up">
        <h1 className="text-3xl font-bold text-amber-700">精神避难所</h1>

        <p className="text-gray-500 text-lg">
          今天想聊聊哪条截图？
        </p>

        <div className="space-y-4 mt-8">
          <a
            href="/login"
            className="block btn-primary w-full text-center"
          >
            登录
          </a>
          <a
            href="/register"
            className="block btn-secondary w-full text-center"
          >
            注册
          </a>
        </div>

        <p className="text-gray-400 text-sm pt-8">
          一个面向社交媒体焦虑的网站工具<br />
          帮助你从焦虑、不安、自我否定中抽离出来
        </p>
      </div>
    </main>
  );
}
