import { LoginForm } from '@/components/login-form'

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#07182c] px-5 py-16">
      <div className="pointer-events-none absolute -left-36 -top-52 h-[42rem] w-[42rem] rounded-full bg-[#183354]" />
      <div className="pointer-events-none absolute -bottom-56 -right-44 h-[38rem] w-[38rem] rounded-full bg-[#3a263a]" />

      <header className="absolute left-5 top-5 z-10 flex items-center gap-3 sm:left-12 sm:top-9">
        <div className="grid size-11 place-items-center rounded-full border-2 border-[#d4a72c] bg-[#713249] text-sm font-extrabold text-white shadow-lg">
          PC
        </div>
        <div className="text-white">
          <p className="text-[15px] font-bold leading-tight sm:text-base">
            Dirección General de Protección Civil
          </p>
          <p className="text-xs text-slate-300">Municipio de Benito Juárez, Quintana Roo</p>
        </div>
      </header>

      <section className="relative z-10 w-full max-w-[520px] rounded-2xl border border-slate-200 bg-white px-6 py-9 shadow-[0_28px_80px_rgba(0,0,0,0.38)] sm:px-10 sm:py-10">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-3 grid size-16 place-items-center rounded-full border-[3px] border-[#d4a72c] bg-[#713249] text-xl font-extrabold text-white shadow-md">
            PC
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#19365f]">SIPREC V2</h1>
          <p className="mt-1 text-sm text-slate-500">
            Plataforma Administrativa · Acceso Institucional
          </p>
        </div>
        <LoginForm />
      </section>
    </main>
  )
}
