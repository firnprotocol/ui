import { CopyableField } from "@components/fields/CopyableField";
import { Card } from "@tw/Card";

export const PublicKeyForm = ({ pub }) => {
  return (
    <Card title="RECEIVE FUNDS PRIVATELY FROM ANOTHER FIRN USER">
      <CopyableField
        value={pub}
        label="PUBLIC KEY"
        helperText={
          'Share this key with others to receive funds (the other user should use this key in the "send" tab).'
        }
      />
    </Card>
  );
};
