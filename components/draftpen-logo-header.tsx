import Image from "next/image";

export const DraftpenLogoHeader = () => (
  <div className="my-1.5 flex items-center gap-2">
    <Image
      alt="Draftpen"
      className="size-5"
      height={20}
      src="/draftpen.svg"
      width={20}
    />
    <h2 className="font-sans font-normal text-foreground text-base dark:text-foreground">
      Draftpen
    </h2>
  </div>
);
