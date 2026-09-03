# Origin V1 Compatibility Matrix

| Origin Snapshot path                          | FigureTemplate path                    | Disposition           | Diagnostic on deviation          |
| --------------------------------------------- | -------------------------------------- | --------------------- | -------------------------------- |
| `page.*`                                      | `page.*`                               | mapped                | `ORIGIN_LOSSY_CONVERSION`        |
| `layers[].frame`                              | `panels[].frame`                       | mapped                | `FIGURE_DOMAIN_INVARIANT_FAILED` |
| `layers[].xAxis/yAxis`                        | `panels[].axes[]`                      | mapped                | `ORIGIN_INVALID_REFERENCE`       |
| `layers[].plots[].bindings`                   | `dataSlots[]` + `plotSlots[].bindings` | mapped                | `ORIGIN_INVALID_REFERENCE`       |
| `scatter/line/line-symbol`                    | `markers/line/line-markers`            | mapped                | `ORIGIN_SNAPSHOT_INVALID`        |
| symmetric/asymmetric error roles              | Plot Slot error bindings               | mapped                | `FIGURE_DOMAIN_INVARIANT_FAILED` |
| legend/text/arrow/rectangle/reference-line    | `annotations[]`                        | mapped                | `ORIGIN_LOSSY_CONVERSION`        |
| `unknownProperties.*`                         | `extensions.origin.*`                  | preservedInExtensions | `ORIGIN_UNSUPPORTED_PROPERTY`    |
| `automation[]` and script-like extension keys | none                                   | ignoredForSecurity    | `ORIGIN_SCRIPT_IGNORED`          |
| dangerous object keys                         | none                                   | dropped               | `ORIGIN_DANGEROUS_KEY_REJECTED`  |

V1 不读取 OTP/OTPU，不执行 LabTalk、Origin C、Python 或宏，也不保存脚本文本。
