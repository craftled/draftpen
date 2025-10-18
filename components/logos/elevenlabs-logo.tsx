export function ElevenLabsLogo() {
  return (
    <div className="flex items-center justify-center">
      {/* Dark logo for light backgrounds */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt="ElevenLabs"
        className="block h-12 w-auto dark:hidden"
        src="https://eleven-public-cdn.elevenlabs.io/payloadcms/pwsc4vchsqt-ElevenLabsGrants.webp"
      />
      {/* White logo for dark backgrounds */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt="ElevenLabs"
        className="hidden h-12 w-auto dark:block"
        src="https://eleven-public-cdn.elevenlabs.io/payloadcms/cy7rxce8uki-IIElevenLabsGrants%201.webp"
      />
    </div>
  );
}
