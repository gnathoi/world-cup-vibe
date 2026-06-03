type Props = {
  showAdminLink?: boolean;
};

export default function SiteFooter({ showAdminLink = false }: Props) {
  return (
    <footer className="bg-ink text-cream/80">
      <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono text-xs tracking-widest">
        <span className="hidden sm:block">GOAL! THE 2026 SWEEPSTAKE</span>
        <span aria-hidden className="hidden sm:block">{"// // // // //"}</span>
        <span className="flex items-center gap-4 flex-wrap justify-center">
          <span>POWERED BY THE OPENFOOTBALL WIRE</span>
          {showAdminLink ? (
            <a href="/admin" className="hover:text-cream">
              /ADMIN
            </a>
          ) : null}
        </span>
      </div>
    </footer>
  );
}
