-- These IDs match the three service radio buttons in index.html.
-- INSERT IGNORE keeps any services already created by an administrator intact.

INSERT IGNORE INTO servicios (id, nombre, precio) VALUES
  (1, 'Corte', 15000.00),
  (2, 'Barba', 8000.00),
  (3, 'Corte + Barba', 20000.00);
