import type { Meta, StoryObj } from "@storybook/react-vite";
import { Nav } from "./Nav";

const meta: Meta<typeof Nav> = {
  title: "Components/Nav",
  component: Nav,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof Nav>;

export const Default: Story = {
  render: (args) => (
    <div className="bg-paper-dark px-10">
      <Nav {...args} />
    </div>
  ),
};
