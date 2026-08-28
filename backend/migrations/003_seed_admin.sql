-- Development admin account. Change this password before using a shared or production database.
-- INSERT IGNORE keeps an existing account with this email intact.

INSERT IGNORE INTO usuarios (email, password, role) VALUES
  ('admin@barberia.com', '$2b$10$jC7.iLep7DHxWyyh86Ru1.zO0mRJATpVpzDdY5EHe5NFmgHVD4FKi', 'admin');
