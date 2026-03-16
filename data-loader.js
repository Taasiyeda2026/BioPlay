import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {
    "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}

ROOT = Path(__file__).resolve().parents[1]
XLSX_PATH = ROOT / "biomimicry_escape_room.xlsx"
DATA_DIR = ROOT / "data"


def parse_workbook(path: Path):
    with zipfile.ZipFile(path) as workbook_zip:
        shared_strings = []
        if "xl/sharedStrings.xml" in workbook_zip.namelist():
            shared_root = ET.fromstring(workbook_zip.read("xl/sharedStrings.xml"))
            for shared_item in shared_root.findall("a:si", NS):
                text = "".join(t.text or "" for t in shared_item.findall(".//a:t", NS))
                shared_strings.append(text)

        workbook_root = ET.fromstring(workbook_zip.read("xl/workbook.xml"))
        relation_root = ET.fromstring(workbook_zip.read("xl/_rels/workbook.xml.rels"))
        relation_map = {
            relation.attrib["Id"]: relation.attrib["Target"] for relation in relation_root
        }

        sheets = {}
        for sheet in workbook_root.findall("a:sheets/a:sheet", NS):
            sheet_name = sheet.attrib["name"]
            relation_id = sheet.attrib[
                "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
            ]
            target = "xl/" + relation_map[relation_id].lstrip("/")
            sheet_root = ET.fromstring(workbook_zip.read(target))

            rows = []
            for row in sheet_root.findall("a:sheetData/a:row", NS):
                values_by_column = {}
                for cell in row.findall("a:c", NS):
                    ref = cell.attrib.get("r", "")
                    col_match = re.match(r"[A-Z]+", ref)
                    if not col_match:
                        continue
                    column = col_match.group(0)
                    cell_type = cell.attrib.get("t")
                    value_node = cell.find("a:v", NS)
                    value = ""
                    if value_node is not None:
                        raw_value = value_node.text or ""
                        if cell_type == "s" and raw_value.isdigit():
                            index = int(raw_value)
                            value = shared_strings[index] if index < len(shared_strings) else ""
                        else:
                            value = raw_value
                    values_by_column[column] = value
                rows.append(values_by_column)
            sheets[sheet_name] = rows

    return sheets


def row_to_record(row, headers):
    return {
        key: row.get(column, "").strip() if isinstance(row.get(column, ""), str) else row.get(column, "")
        for column, key in headers.items()
    }


def write_json(name, payload):
    (DATA_DIR / name).write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    sheets = parse_workbook(XLSX_PATH)

    game_config_rows = sheets["Game_Config"][1:]
    game_config = {row.get("A", "").strip(): row.get("B", "").strip() for row in game_config_rows if row.get("A")}
    write_json("game-config.json", game_config)

    mcq_headers = {
        "A": "organism",
        "B": "gate",
        "C": "questionType",
        "D": "question",
        "E": "correctAnswer",
        "F": "optionA",
        "G": "optionB",
        "H": "optionC",
        "I": "optionD",
        "J": "hint",
        "K": "didYouKnow",
    }
    mcq_rows = [row_to_record(row, mcq_headers) for row in sheets["MCQ_Stages"][1:] if row.get("A")]
    write_json("mcq-stages.json", mcq_rows)

    image_headers = {
        "A": "organism",
        "B": "gate",
        "C": "taskType",
        "D": "prompt",
        "E": "sceneDescription",
        "F": "targetLabel",
        "G": "correctAnswer",
        "H": "hint",
        "I": "extraInfo",
    }
    image_rows = [row_to_record(row, image_headers) for row in sheets["Image_Tasks"][1:] if row.get("A")]
    write_json("image-tasks.json", image_rows)

    matching_headers = {
        "A": "organism",
        "B": "gate",
        "C": "taskType",
        "D": "prompt",
        "E": "mainOrganism",
        "F": "mainInvention",
        "G": "otherOrganism1",
        "H": "otherInvention1",
        "I": "otherOrganism2",
        "J": "otherInvention2",
        "K": "solution",
    }
    matching_rows = [row_to_record(row, matching_headers) for row in sheets["Matching_Tasks"][1:] if row.get("A")]
    write_json("matching-tasks.json", matching_rows)

    cipher_headers = {
        "A": "gate",
        "B": "taskType",
        "C": "instruction",
        "D": "solution",
        "E": "afterSolve",
        "F": "continueLabel",
        "G": "endingMessage",
    }
    cipher_rows = [row_to_record(row, cipher_headers) for row in sheets["Final_Cipher"][1:] if row.get("A")]
    write_json("final-cipher.json", cipher_rows[0] if cipher_rows else {})

    print("JSON data generated in data/")


if __name__ == "__main__":
    main()
