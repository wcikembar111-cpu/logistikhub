import { FloatingRobotCompanion, FloatingRobotCompanionProps } from './FloatingRobotCompanion';

export type LoginFloatingRobotProps = FloatingRobotCompanionProps;

export function LoginFloatingRobot(props: LoginFloatingRobotProps) {
  return (
    <div className="fixed bottom-4 right-4 z-40">
      <FloatingRobotCompanion 
        {...props} 
        mode="login" 
      />
    </div>
  );
}
