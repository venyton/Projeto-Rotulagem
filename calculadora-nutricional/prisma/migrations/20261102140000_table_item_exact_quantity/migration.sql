-- O campo legado permanece para compatibilidade com clientes antigos.
-- Registros legados mantêm NULL e continuam sendo lidos pelo campo anterior.
ALTER TABLE "TableItem" ADD COLUMN "quantityExact" TEXT;
