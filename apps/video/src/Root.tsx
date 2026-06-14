import "./index.css";
import { Composition } from "remotion";
import { InboxToInsightComposition, MyComposition } from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SlashCashSocial"
        component={MyComposition}
        durationInFrames={720}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="InboxToInsight"
        component={InboxToInsightComposition}
        durationInFrames={510}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
