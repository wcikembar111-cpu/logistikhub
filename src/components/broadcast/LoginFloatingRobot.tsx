import { FloatingRobotCompanion, FloatingRobotCompanionProps } from './FloatingRobotCompanion';

export type LoginFloatingRobotProps = FloatingRobotCompanionProps;

export function LoginFloatingRobot(props: LoginFloatingRobotProps) {
  return (
    <div className="relative flex flex-col items-center justify-center">
      <FloatingRobotCompanion 
        {...props} 
        mode="login" 
      />
    </div>
  );
}

