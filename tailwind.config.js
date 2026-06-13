@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-stone-50 text-stone-800 font-sans;
  }
}

@layer components {
  .btn-primary {
    @apply bg-amber-600 hover:bg-amber-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
  }
  .btn-secondary {
    @apply bg-stone-200 hover:bg-stone-300 text-stone-700 font-medium px-4 py-2 rounded-lg transition-colors;
  }
  .btn-danger {
    @apply bg-red-100 hover:bg-red-200 text-red-700 font-medium px-4 py-2 rounded-lg transition-colors;
  }
  .input-field {
    @apply w-full border border-stone-300 rounded-lg px-3 py-2 text-stone-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent;
  }
  .card {
    @apply bg-white rounded-xl shadow-sm border border-stone-200 p-5;
  }
  .badge-alert {
    @apply bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full;
  }
  .badge-ok {
    @apply bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full;
  }
}
