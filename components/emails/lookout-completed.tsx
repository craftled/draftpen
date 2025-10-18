import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Img,
  Markdown,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

interface SearchCompletedEmailProps {
  chatTitle: string;
  assistantResponse: string;
  chatId: string;
}

const SearchCompletedEmail = (props: SearchCompletedEmailProps) => (
  <Html dir="ltr" lang="en">
    <Tailwind>
      <Head />
      <Body className="bg-white py-[40px] font-sans">
        <Container className="mx-auto my-[24px] max-w-[560px] rounded-lg border border-neutral-300 border-solid bg-[#FFFFFF] px-[24px] py-[48px]">
          <Section className="mb-6 text-center">
            <Img
              alt="Draftpen"
              className="mx-auto mb-[24px] h-[48px] w-[48px]"
              src="https://draftpen.com/icon.png"
            />
            <Text className="m-0 mb-[16px] font-semibold text-[#020304] text-[24px]">
              Daily Lookout Complete
            </Text>
            <Text className="!mt-2 m-0 inline-block rounded-lg bg-[#F3F4F6] px-[16px] py-[8px] font-medium text-[#374151] text-[14px]">
              {props.chatTitle}
            </Text>
          </Section>

          <Section className="mb-6">
            <Markdown
              markdownContainerStyles={{
                fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
              }}
              markdownCustomStyles={{
                h1: {
                  color: "#020304",
                  fontSize: "20px",
                  fontWeight: "600",
                  marginBottom: "20px",
                  marginTop: "32px",
                },
                h2: {
                  color: "#020304",
                  fontSize: "18px",
                  fontWeight: "600",
                  marginBottom: "16px",
                  marginTop: "32px",
                },
                h3: {
                  color: "#020304",
                  fontSize: "16px",
                  fontWeight: "600",
                  marginBottom: "12px",
                  marginTop: "24px",
                },
                p: {
                  color: "#374151",
                  fontSize: "16px",
                  lineHeight: "1.65",
                  marginBottom: "20px",
                  marginTop: "0",
                },
                ul: {
                  color: "#374151",
                  fontSize: "16px",
                  lineHeight: "1.65",
                  marginBottom: "20px",
                  paddingLeft: "24px",
                  marginTop: "0",
                },
                ol: {
                  color: "#374151",
                  fontSize: "16px",
                  lineHeight: "1.65",
                  marginBottom: "20px",
                  paddingLeft: "24px",
                  marginTop: "0",
                },
                li: { marginBottom: "8px" },
                bold: { fontWeight: "600", color: "#020304" },
                italic: { fontStyle: "italic", color: "#6B7280" },
                codeInline: {
                  backgroundColor: "#F3F4F6",
                  color: "#374151",
                  padding: "3px 6px",
                  borderRadius: "4px",
                  fontSize: "14px",
                  fontFamily:
                    'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                },
                blockQuote: {
                  borderLeft: "3px solid #D1D5DB",
                  paddingLeft: "20px",
                  margin: "24px 0",
                  fontStyle: "italic",
                  color: "#6B7280",
                },
              }}
            >
              {props.assistantResponse}
            </Markdown>
          </Section>

          <Section className="mb-[40px] text-center">
            <Button
              className="box-border inline-block rounded-[8px] bg-[#020304] px-[32px] py-[14px] font-medium text-[16px] text-white no-underline"
              href={`https://draftpen.com/search/${props.chatId}`}
            >
              View Full Report
            </Button>
          </Section>

          <Section className="border-black/30 border-t border-solid pt-[32px] text-center">
            <Img
              alt="Draftpen"
              className="mx-auto mb-[16px] h-[32px] w-[32px]"
              src="https://draftpen.com/icon.png"
            />
            <Text className="m-0 text-[#6B7280] text-[14px]">
              Scira AI •{" "}
              <a
                className="text-[#6B7280] no-underline"
                href="https://draftpen.com"
              >
                draftpen.com
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

SearchCompletedEmail.PreviewProps = {
  chatTitle: "Latest AI Developments in Healthcare",
  assistantResponse:
    "# AI Healthcare Breakthrough\n\nRecent developments in AI-powered medical diagnostics have shown **remarkable progress** in early disease detection.\n\n## Key Findings:\n- 95% accuracy in cancer screening\n- Reduced diagnosis time by 60%\n- Cost-effective implementation\n\n*This represents a significant advancement in medical technology.*",
  chatId: "chat-123-example",
};

export default SearchCompletedEmail;
