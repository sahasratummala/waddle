import TaskList from "@/components/tasks/TaskList";

export default function DailyTasks() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-black text-forest">Daily Tasks</h1>
          <p className="text-forest/50 text-sm font-medium">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <TaskList />
      </div>
    </div>
  );
}