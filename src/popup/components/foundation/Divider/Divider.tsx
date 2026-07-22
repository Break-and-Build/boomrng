import styles from './Divider.module.css';

export interface DividerProps {
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({ className }) => {
  const classes = [styles.divider, className].filter(Boolean).join(' ');
  return <hr className={classes} />;
};
