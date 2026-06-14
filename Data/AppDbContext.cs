using ExpenseTracker.Models;
using Microsoft.EntityFrameworkCore;

namespace ExpenseTracker.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Gasto> Gastos => Set<Gasto>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Gasto>(e =>
        {
            e.Property(g => g.Monto).HasColumnType("decimal(12,2)");
            e.Property(g => g.FechaRegistro)
             .HasDefaultValueSql("CURRENT_TIMESTAMP")
             .ValueGeneratedOnAdd();
        });
    }
}
