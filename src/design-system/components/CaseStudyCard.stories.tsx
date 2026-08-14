import type { Meta, StoryObj } from "@storybook/react-vite";
import { CaseStudyCard } from "./CaseStudyCard";

const meta: Meta<typeof CaseStudyCard> = {
  title: "Components/CaseStudyCard",
  component: CaseStudyCard,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof CaseStudyCard>;

export const Default: Story = {
  args: {
    title: "Rethinking Soccer Data Entry",
    description:
      "Reducing data entry costs by 20% to 40% through RTS-inspired user flow/interface and rapid AI prototyping.",
    tags: ["Research", "Prototyping"],
    meta: "6 months",
  },
  render: (args) => (
    <div className="max-w-sm bg-paper-dark p-6">
      <CaseStudyCard {...args} />
    </div>
  ),
};

export const Grid: Story = {
  render: () => (
    <div className="grid max-w-4xl grid-cols-2 gap-8 bg-paper-dark p-6">
      <CaseStudyCard
        title="Rethinking Soccer Data Entry"
        description="Reducing data entry costs by 20% to 40% through RTS-inspired user flow/interface and rapid AI prototyping."
        tags={["Research", "Prototyping"]}
        meta="6 months"
      />
      <CaseStudyCard
        title="Unified Data Table Designs"
        description="Reducing cognitive load with design guidelines and consistency."
        tags={["Product Design"]}
        thumbnailClassName="bg-ink-100"
      />
    </div>
  ),
};
