import React from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Brain,
  ChartNoAxesCombined,
  GraduationCap,
  Users,
} from 'lucide-react';

const EcosystemSection: React.FC = () => {
  const ecosystemItems = [
    {
      icon: BookOpen,
      title: 'Learning Content',
      description:
        'Courses, lessons, resources, and practice material organized around meaningful learning goals.',
    },
    {
      icon: Brain,
      title: 'Personalization',
      description:
        'Learning evidence is used to understand what each learner needs next.',
    },
    {
      icon: ChartNoAxesCombined,
      title: 'Performance',
      description:
        'Progress and assessment results provide a clearer picture of learning over time.',
    },
    {
      icon: GraduationCap,
      title: 'Learner Growth',
      description:
        'Recommendations and targeted practice help learners continue improving.',
    },
    {
      icon: Users,
      title: 'Instructor Support',
      description:
        'Instructors can use learner progress and performance information to better understand their learners.',
    },
  ];

  return (
    <section className="py-24 bg-surface/30 border-y border-border-muted overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-3xl mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-signal font-semibold tracking-wider text-sm mb-4"
          >
            THE LEARNING ECOSYSTEM
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl md:text-5xl mb-6 text-text-primary"
          >
            One system. Multiple signals.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-text-secondary"
          >
            Personalized learning works when content, learner activity,
            performance, and guidance work together instead of existing as
            isolated parts.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ecosystemItems.map((item, index) => {
            const Icon = item.icon;

            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className={[
                  'group bg-surface border border-border rounded-2xl p-6',
                  'transition-colors duration-300',
                  'hover:border-signal/30 hover:bg-surface-elevated',
                  index === ecosystemItems.length - 1
                    ? 'sm:col-span-2 lg:col-span-1'
                    : '',
                ].join(' ')}
              >
                <div className="w-10 h-10 rounded-xl bg-signal-soft text-signal flex items-center justify-center mb-5">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>

                <h3 className="font-display text-xl text-text-primary mb-3">
                  {item.title}
                </h3>

                <p className="text-sm leading-relaxed text-text-secondary">
                  {item.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default EcosystemSection;