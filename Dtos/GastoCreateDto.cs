using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ExpenseTracker.Dtos;

public class GastoCreateDto
{
    [Required(ErrorMessage = "La descripción es obligatoria.")]
    [MaxLength(255)]
    [JsonPropertyName("concept")]
    public string Concept { get; set; } = string.Empty;

    [Range(0.01, double.MaxValue, ErrorMessage = "El monto debe ser mayor a 0.")]
    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }

    [Required(ErrorMessage = "La categoría es obligatoria.")]
    [MaxLength(100)]
    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;

    [JsonPropertyName("date")]
    public DateOnly? Date { get; set; }
}
