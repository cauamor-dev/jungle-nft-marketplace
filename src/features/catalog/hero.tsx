import { Link } from '@tanstack/react-router'
import heroDots from '@/assets/icons/hero-dots.svg'
import arrow from '@/assets/icons/arrow-right-sm.svg'
import maskMobile from '@/assets/icons/hero-mask-mobile.svg'
import heroLarge from '@/assets/nfts/esmeralda-800.webp'
import heroSmall from '@/assets/nfts/esmeralda-400.webp'
import violeta from '@/assets/nfts/violeta-400.webp'

export function Hero() {
  return (
    <>
      <section aria-labelledby="hero-title" className="hidden h-[450px] items-center pl-10 md:flex">
        <div className="flex w-full items-center justify-between">
          <div className="flex w-[600px] max-w-[55%] flex-col items-end gap-11">
            <div className="flex w-full flex-col gap-1">
              <p className="text-sm font-medium leading-4 tracking-[1.4px]">Bem-vindo à Kurio</p>
              <h1 id="hero-title" className="mt-2 text-[43px] font-bold leading-[70px]">
                SEJA DONO DO FUTURO
                <br />
                DA ARTE DIGITAL
              </h1>
              <p className="max-w-[557px] text-sm leading-6 text-text-secondary">
                Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.
              </p>
            </div>
            <div className="flex w-full items-center justify-between">
              <Link
                to="/mercado"
                className="flex h-10 w-[140px] items-center justify-center rounded-md bg-primary pl-7 pr-9 text-base font-bold text-ink hover:bg-text-accent"
              >
                EXPLORAR
              </Link>
              <img src={heroDots} alt="" className="h-2 w-10" />
            </div>
          </div>
          <img
            src={heroLarge}
            alt="Macaco de óculos e jaqueta verde, arte da coleção Kurio Apes"
            width={450}
            height={450}
            fetchPriority="high"
            className="size-[450px] max-w-[40%] rounded-3xl object-cover"
            style={{ aspectRatio: '1' }}
          />
        </div>
      </section>

      <section aria-labelledby="hero-title-mobile" className="relative flex min-h-[190px] items-center overflow-hidden rounded-xl bg-surface-card p-4 md:hidden">
        <img src={maskMobile} alt="" className="absolute left-0 top-0 h-full w-full max-w-none object-cover" />
        <div className="relative flex w-full items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium leading-4">Bem-vindo à Kurio</p>
              <h1 id="hero-title-mobile" className="text-lg font-bold leading-[29px]">
                SEJA DONO DA
                <br />
                CULTURA DIGITAL
              </h1>
              <p className="text-xs leading-[18px] text-text-secondary">Descubra NFTs selecionados de criadores do mundo todo.</p>
            </div>
            <Link to="/mercado" className="flex items-center gap-2 text-xs font-bold leading-[14px] text-text-accent">
              EXPLORAR
              <img src={arrow} alt="" className="size-4" />
            </Link>
          </div>
          <div className="relative size-[138px] shrink-0">
            <img src={heroSmall} alt="" width={138} height={138} className="size-full rounded-2xl object-cover" />
            <img src={violeta} alt="" width={58} height={58} className="absolute left-[14px] top-[88px] size-[58px] rounded-2xl object-cover" />
          </div>
        </div>
      </section>
    </>
  )
}
