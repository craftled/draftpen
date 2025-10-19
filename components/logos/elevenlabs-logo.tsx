import Image from "next/image";

export function ElevenLabsLogo() {
  return (
    <div className="flex items-center justify-center">
      <Image
        alt="ElevenLabs grants logo"
        className="block h-12 w-auto dark:hidden"
        height={160}
        src="https://eleven-public-cdn.elevenlabs.io/payloadcms/pwsc4vchsqt-ElevenLabsGrants.webp"
        width={400}
      />
      <Image
        alt="ElevenLabs grants logo inverted"
        className="hidden h-12 w-auto dark:block"
        height={160}
        src="https://eleven-public-cdn.elevenlabs.io/payloadcms/cy7rxce8uki-IIElevenLabsGrants%201.webp"
        width={400}
      />
    </div>
  );
}
