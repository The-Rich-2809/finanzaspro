using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace ExpenseTracker.Models;

[Table("gastos")]
public class Gasto
{
    [Column("id")]
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [Column("descripcion")]
    [JsonPropertyName("concept")]
    public string Descripcion { get; set; } = string.Empty;

    [Column("monto")]
    [JsonPropertyName("amount")]
    public decimal Monto { get; set; }

    [Column("categoria")]
    [JsonPropertyName("category")]
    public string Categoria { get; set; } = string.Empty;

    [Column("fecha")]
    [JsonPropertyName("date")]
    public DateOnly Fecha { get; set; }

    [Column("fecha_registro")]
    [JsonIgnore]
    public DateTime FechaRegistro { get; set; }
}
