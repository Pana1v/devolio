import { getRepositoryDetails } from "../../utils";

export interface Project {
  name: string;
  demoLink: string;
  tags?: string[],
  description?: string;
  postLink?: string;
  demoLinkRel?: string;
  [key: string]: any;
}

export const projects: Project[] = [
  {
    repo: 'Pana1v/Inter-IIT-Tech-12.0',
    name: 'Inter IIT Tech 12.0',
    demoLink: 'https://github.com/Pana1v/Inter-IIT-Tech-12.0',
    tags: ['Tech'],
    description: 'A project focused on technology innovations for the Inter IIT Tech event.'
  },
  {
    repo: 'Pana1v/ros-amr-phoenix',
    name: 'ROS AMR Phoenix',
    demoLink: 'https://github.com/Pana1v/ros-amr-phoenix',
    tags: ['Robotics'],
    description: 'A robotics initiative utilizing ROS for autonomous mobile robots.'
  },
  {
    repo: 'Pana1v/ictc',
    name: 'ICTC',
    demoLink: 'https://github.com/Pana1v/ictc',
    tags: ['Tech'],
    description: 'A tech project aimed at developing innovative solutions within ICTC.'
  },
]
