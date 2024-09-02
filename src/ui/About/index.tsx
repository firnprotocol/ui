import { Card } from "@tw/Card";
import { TOKEN_URL, UNISWAP_URL } from "utils/urls";

export const About = () => {
  return (
    <div>
      <Card>
        <ParagraphWithTitle
          title="ADVANCING CRYPTOGRAPHIC PRIVACY"
          className="pb-2"
        >
          Firn is your simple, fast, efficient private wallet. Secure your funds
          with cutting-edge zero-knowledge proofs.
        </ParagraphWithTitle>
        <ParagraphWithTitle title="Want to learn more?">
          Check out our
          <StyledLink href="https://docs.firn.io">documentation</StyledLink>.
        </ParagraphWithTitle>
      </Card>
    </div>
  );
};

const ParagraphWithTitle = ({ title, className, children }) => {
  return (
    <div className={className}>
      <span className="font-telegrama text-lg text-sky-600">{title}</span>
      <br />
      <p className="leading-7 text-justify text-gray-500">{children}</p>
    </div>
  );
};

const StyledLink = ({ children, ...props }) => {
  return (
    <a className="text-red-600 hover:text-red-500" target="_blank" {...props}>
      {" "}
      {children}
    </a>
  );
};
