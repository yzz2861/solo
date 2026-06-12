import os
import sys
import click
from datetime import date

from .models import StudentProfile
from .config import load_school_requirements, find_student_requirements
from .scanner import scan_student_directory
from .checker import run_all_checks
from .reporter import (
    generate_consultant_report,
    generate_student_report,
    generate_report,
)


@click.group()
@click.version_option(version="0.1.0", prog_name="留学材料清点器")
def cli():
    """留学材料清点器 - 帮你快速检查申请材料是否齐全"""
    pass


@cli.command()
@click.argument("student_dir", type=click.Path(exists=True, file_okay=False))
@click.option("--schools-file", "-s", type=click.Path(exists=True, dir_okay=False),
              help="学校要求表 YAML 文件路径，默认在学生目录下查找")
@click.option("--mode", "-m", type=click.Choice(["consultant", "student"]),
              default="consultant", help="报告模式：顾问版/学生版")
@click.option("--sort-by", type=click.Choice(["deadline", "issue_count"]),
              default="deadline", help="排序方式：截止日/问题数量")
@click.option("--output", "-o", type=click.Path(), help="输出报告到文件")
@click.option("--student-name", "-n", help="学生姓名，默认使用目录名")
def check(student_dir, schools_file, mode, sort_by, output, student_name):
    """检查学生目录的申请材料状态"""

    student_dir = os.path.abspath(student_dir)

    if not student_name:
        student_name = os.path.basename(student_dir.rstrip("/"))

    if not schools_file:
        schools_file = find_student_requirements(student_dir)
        if not schools_file:
            click.echo("❌ 未找到学校要求表，请在学生目录下放置 schools.yaml", err=True)
            click.echo("   或使用 --schools-file 指定路径", err=True)
            sys.exit(1)

    click.echo(f"📂 扫描学生目录: {student_dir}")
    click.echo(f"📋 使用学校要求表: {schools_file}")
    click.echo("")

    try:
        schools = load_school_requirements(schools_file)
    except Exception as e:
        click.echo(f"❌ 加载学校要求表失败: {e}", err=True)
        sys.exit(1)

    try:
        materials = scan_student_directory(student_dir)
    except Exception as e:
        click.echo(f"❌ 扫描目录失败: {e}", err=True)
        sys.exit(1)

    profile = StudentProfile(
        name=student_name,
        directory=student_dir,
        schools=schools,
        materials=materials,
    )

    issues = run_all_checks(profile)
    profile.issues = issues

    click.echo(f"✅ 扫描完成，找到 {len(materials)} 个材料文件")
    click.echo(f"⚠️  发现 {len(issues)} 个问题")
    click.echo("")

    report = generate_report(profile, mode=mode, sort_by=sort_by)

    if output:
        with open(output, "w", encoding="utf-8") as f:
            f.write(report)
        click.echo(f"📄 报告已保存到: {output}")
    else:
        click.echo(report)


@cli.command(name="list")
@click.argument("student_dir", type=click.Path(exists=True, file_okay=False))
@click.option("--schools-file", "-s", type=click.Path(exists=True, dir_okay=False),
              help="学校要求表 YAML 文件路径")
@click.option("--sort-by", type=click.Choice(["deadline", "issue_count"]),
              default="deadline", help="排序方式")
def list_schools(student_dir, schools_file, sort_by):
    """列出所有申请学校及截止日期"""

    student_dir = os.path.abspath(student_dir)

    if not schools_file:
        schools_file = find_student_requirements(student_dir)
        if not schools_file:
            click.echo("❌ 未找到学校要求表", err=True)
            sys.exit(1)

    try:
        schools = load_school_requirements(schools_file)
    except Exception as e:
        click.echo(f"❌ 加载学校要求表失败: {e}", err=True)
        sys.exit(1)

    try:
        materials = scan_student_directory(student_dir)
    except Exception as e:
        click.echo(f"❌ 扫描目录失败: {e}", err=True)
        sys.exit(1)

    from .checker import run_all_checks
    from .models import StudentProfile

    profile = StudentProfile(
        name=os.path.basename(student_dir.rstrip("/")),
        directory=student_dir,
        schools=schools,
        materials=materials,
    )
    issues = run_all_checks(profile)
    profile.issues = issues

    if sort_by == "deadline":
        sorted_schools = sorted(schools, key=lambda s: s.deadline)
    else:
        from collections import defaultdict
        issue_counts = defaultdict(int)
        for issue in issues:
            if issue.school:
                issue_counts[issue.school] += 1
        sorted_schools = sorted(schools, key=lambda s: (-issue_counts.get(s.school_name, 0), s.deadline))

    today = date.today()

    click.echo("📚 申请学校列表")
    click.echo("=" * 60)

    for i, school in enumerate(sorted_schools, 1):
        days_left = (school.deadline - today).days
        school_issues = [iss for iss in issues if iss.school == school.school_name]
        critical = sum(1 for iss in school_issues if iss.severity.value == "critical")
        warning = sum(1 for iss in school_issues if iss.severity.value == "warning")

        if days_left < 0:
            status = "❌ 已过期"
        elif days_left <= 3:
            status = "🔥 紧急"
        elif days_left <= 7:
            status = "⏰ 即将截止"
        else:
            status = "✅"

        click.echo(
            f"{i:2d}. {school.school_name:<15} "
            f"截止: {school.deadline.strftime('%Y-%m-%d')} "
            f"({days_left:3d}天) {status}"
        )
        click.echo(f"    项目: {school.program}")
        click.echo(f"    问题: 🔴{critical} 🟡{warning}")
        click.echo("")


@cli.command()
@click.argument("student_dir", type=click.Path(exists=True, file_okay=False))
@click.option("--mode", "-m", type=click.Choice(["consultant", "student"]),
              default="consultant", help="待办事项模式")
@click.option("--schools-file", "-s", type=click.Path(exists=True, dir_okay=False),
              help="学校要求表 YAML 文件路径")
def todo(student_dir, mode, schools_file):
    """生成待办事项清单"""

    student_dir = os.path.abspath(student_dir)

    if not schools_file:
        schools_file = find_student_requirements(student_dir)
        if not schools_file:
            click.echo("❌ 未找到学校要求表", err=True)
            sys.exit(1)

    try:
        schools = load_school_requirements(schools_file)
        materials = scan_student_directory(student_dir)
    except Exception as e:
        click.echo(f"❌ 操作失败: {e}", err=True)
        sys.exit(1)

    from .checker import run_all_checks
    from .models import StudentProfile, IssueSeverity, IssueCategory
    from .reporter import _deduplicate_actions

    profile = StudentProfile(
        name=os.path.basename(student_dir.rstrip("/")),
        directory=student_dir,
        schools=schools,
        materials=materials,
    )
    issues = run_all_checks(profile)

    critical = [i for i in issues if i.severity == IssueSeverity.CRITICAL]
    warning = [i for i in issues if i.severity == IssueSeverity.WARNING]

    if mode != "consultant":
        critical = [i for i in critical if i.category != IssueCategory.INTERNAL_NOTE]
        warning = [i for i in warning if i.category != IssueCategory.INTERNAL_NOTE]

    critical_actions = _deduplicate_actions(critical)
    warning_actions = _deduplicate_actions(warning)

    click.echo("✅ 待办事项清单")
    click.echo("=" * 60)
    click.echo("")

    if not critical_actions and not warning_actions:
        click.echo("🎉 所有材料都齐全，没有待办事项！")
        return

    idx = 1
    if critical_actions:
        click.echo("🔴 紧急事项:")
        for action in critical_actions:
            click.echo(f"  {idx}. {action}")
            idx += 1
        click.echo("")

    if warning_actions:
        click.echo("🟡 重要事项:")
        for action in warning_actions:
            click.echo(f"  {idx}. {action}")
            idx += 1


@cli.command()
@click.argument("output_dir", type=click.Path())
@click.option("--force", "-f", is_flag=True, help="覆盖已存在的文件")
def init(output_dir, force):
    """创建示例学生目录和模板文件"""

    output_dir = os.path.abspath(output_dir)

    if os.path.exists(output_dir) and not force:
        click.echo(f"❌ 目录已存在: {output_dir}", err=True)
        click.echo("   使用 --force 覆盖", err=True)
        sys.exit(1)

    os.makedirs(output_dir, exist_ok=True)

    import shutil
    template_dir = os.path.join(os.path.dirname(__file__), "templates")

    schools_template = os.path.join(template_dir, "schools_template.yaml")
    schools_target = os.path.join(output_dir, "schools.yaml")
    shutil.copy2(schools_template, schools_target)

    sample_dir = os.path.join(output_dir, "材料")
    os.makedirs(sample_dir, exist_ok=True)

    sample_files = [
        ("成绩单_中文版_v1.pdf", "示例成绩单（中文）"),
        ("成绩单_英文版_v1.pdf", "示例成绩单（英文）"),
        ("成绩单_照片版.jpg", "示例成绩单（照片版）"),
        ("推荐信_张教授_已签名.pdf", "示例推荐信"),
        ("推荐信_李教授_未签名.pdf", "示例推荐信（未签名）"),
        ("护照首页_有效期至2027-12-31.pdf", "示例护照"),
        ("个人陈述_哥伦比亚大学_Why major_final2.pdf", "示例文书"),
        ("个人陈述_纽约大学_Why program_v1.pdf", "示例文书"),
        ("个人陈述_通用版_final.pdf", "示例文书（共用）"),
        ("简历_英文版_v2.pdf", "示例简历"),
    ]

    for filename, description in sample_files:
        filepath = os.path.join(sample_dir, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(f"# 示例文件 - {description}\n")
            f.write(f"# 文件名: {filename}\n")
            f.write(f"# 这是一个占位文件，用于演示文件名识别功能\n")

    click.echo(f"✅ 已创建示例项目: {output_dir}")
    click.echo("")
    click.echo("📂 目录结构:")
    click.echo(f"   {output_dir}/")
    click.echo(f"   ├── schools.yaml      (学校要求表)")
    click.echo(f"   └── 材料/              (材料文件)")
    click.echo("")
    click.echo("🚀 运行以下命令开始检查:")
    click.echo(f"   study-check check {output_dir}")


def main():
    cli()


if __name__ == "__main__":
    main()
