using ExpenseTracker.Data;
using ExpenseTracker.Dtos;
using ExpenseTracker.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ExpenseTracker.Controllers;

[ApiController]
[Route("api/gastos")]
public class GastosController : ControllerBase
{
    private readonly AppDbContext _db;

    public GastosController(AppDbContext db) => _db = db;

    // GET: api/gastos  -> todos, fecha descendente
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Gasto>>> GetGastos()
    {
        var gastos = await _db.Gastos
            .OrderByDescending(g => g.Fecha)
            .ThenByDescending(g => g.Id)
            .AsNoTracking()
            .ToListAsync();

        return Ok(gastos);
    }

    // GET: api/gastos/resumen  -> total, cantidad y desglose por categoría
    [HttpGet("resumen")]
    public async Task<ActionResult> GetResumen()
    {
        var total = await _db.Gastos.SumAsync(g => (decimal?)g.Monto) ?? 0m;
        var cantidad = await _db.Gastos.CountAsync();

        var porCategoria = await _db.Gastos
            .GroupBy(g => g.Categoria)
            .Select(grp => new
            {
                categoria = grp.Key,
                total = grp.Sum(x => x.Monto),
                cantidad = grp.Count()
            })
            .OrderByDescending(x => x.total)
            .ToListAsync();

        return Ok(new { total, cantidad, porCategoria });
    }

    // GET: api/gastos/5
    [HttpGet("{id:int}")]
    public async Task<ActionResult<Gasto>> GetGasto(int id)
    {
        var gasto = await _db.Gastos.FindAsync(id);
        return gasto is null ? NotFound() : Ok(gasto);
    }

    // POST: api/gastos
    [HttpPost]
    public async Task<ActionResult<Gasto>> CrearGasto([FromBody] GastoCreateDto dto)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var gasto = new Gasto
        {
            Descripcion = dto.Concept.Trim(),
            Monto = dto.Amount,
            Categoria = dto.Category.Trim(),
            Fecha = dto.Date ?? DateOnly.FromDateTime(DateTime.Today),
            FechaRegistro = DateTime.Now
        };

        _db.Gastos.Add(gasto);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetGasto), new { id = gasto.Id }, gasto);
    }

    // DELETE: api/gastos/5
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> EliminarGasto(int id)
    {
        var gasto = await _db.Gastos.FindAsync(id);
        if (gasto is null) return NotFound();

        _db.Gastos.Remove(gasto);
        await _db.SaveChangesAsync();

        // El frontend espera un cuerpo JSON con { success, id }
        return Ok(new { success = true, id });
    }
}
